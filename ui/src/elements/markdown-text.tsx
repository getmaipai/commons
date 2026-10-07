"use client";

import "@assistant-ui/react-markdown/styles/dot.css";
import "streamdown/styles.css";
import "./markdown-text.css";

import {
  type CodeHeaderProps,
  type SyntaxHighlighterProps as AuiSyntaxHighlighterProps,
  escapeCurrencyDollars,
  normalizeMathDelimiters,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import type { RemendConfig, StreamdownTextComponents } from "@assistant-ui/react-streamdown";
import { Streamdown } from "streamdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { harden } from "rehype-harden";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import {
  type FC,
  Suspense,
  lazy,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuiState, type TextMessagePartProps, type ThreadMessage } from "@assistant-ui/react";
import { useMediaQuery } from "usehooks-ts";
import { CheckIcon, CopyIcon } from "lucide-react";

import { TooltipIconButton } from "./tooltip-icon-button";
import { useCopyToClipboard } from "./hooks/use-copy-to-clipboard";
import { cn } from "cn";

// CHAT-RICH-02: shiki, mermaid and math (katex/remark-math/rehype-katex)
// pushed Chat's own eager entry chunk to 3.06 MB (CHAT-RICH-01, docs/
// dev.md) - past the PWA plugin's 2 MiB precache ceiling. All three load
// lazily now, only when a message actually needs them: shiki/mermaid
// through React.lazy on the two SyntaxHighlighter slots below (assistant-
// ui's own CodeOverride only ever mounts that slot for a real fenced
// code block, so the dynamic import fires only then); math through a
// synchronous text scan (`MATH_HINT`) that dynamically imports remark-
// math/rehype-katex/katex's own CSS the first time a message's raw text
// looks like it contains any, per assistant-ui's own componentsByLanguage/
// dynamic-plugin guidance. `escapeCurrencyDollars`/`normalizeMathDelimiters`
// stay eager - pure string functions from the already-required `@assistant-
// ui/react-markdown` package, no bundle cost of their own.
const LazySyntaxHighlighter = lazy(() =>
  import("./shiki-highlighter").then((m) => ({ default: m.SyntaxHighlighter })),
);
const LazyStreamdownTextPrimitive = lazy(() =>
  import("@assistant-ui/react-streamdown").then((m) => ({ default: m.StreamdownTextPrimitive })),
);
const LazyMermaidDiagram = lazy(() =>
  import("./mermaid-diagram").then((m) => ({ default: m.MermaidDiagram })),
);

// A minimal, dependency-free stand-in for the real highlighter/diagram
// while its own chunk loads (once per session; near-instant after) -
// deliberately never imports anything from shiki-highlighter.tsx or
// mermaid-diagram.tsx, since a bundler can't split a module from its
// own eagerly-imported dependencies, only from modules nothing else
// statically imports.
const PendingCodeBlock: FC<{ code: string }> = ({ code }) => (
  <pre className="aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed">
    <code>{code}</code>
  </pre>
);

// Language models emit math in delimiters remark-math doesn't parse
// (LaTeX \(...\)/\[...\] brackets) and write plain currency ($5) that
// single-dollar math would otherwise eat - both documented on these
// exports' own JSDoc as the intended `preprocess` composition.
const preprocessMath = (text: string) =>
  escapeCurrencyDollars(normalizeMathDelimiters(text));

// A cheap, deliberately over-inclusive scan (a bare "$5" also matches):
// false positives cost one extra dynamic import, false negatives cost
// broken math rendering, so this errs toward loading. Mirrors the same
// delimiter shapes `normalizeMathDelimiters` itself normalizes (LaTeX
// brackets, the custom [/math]/[/inline] tags) plus a bare `$`.
const MATH_HINT = /\$|\\\(|\\\[|\[\/math\]|\[\/inline\]/;

interface MathPlugins {
  remarkPlugins: Pluggable[];
  rehypePlugins: Pluggable[];
}

let mathPluginsPromise: Promise<MathPlugins> | null = null;
function loadMathPlugins(): Promise<MathPlugins> {
  if (!mathPluginsPromise) {
    mathPluginsPromise = Promise.all([
      import("remark-math"),
      import("rehype-katex"),
      import("katex/dist/katex.css"),
    ])
      .then(([remarkMathMod, rehypeKatexMod]) => ({
        remarkPlugins: [remarkGfm, rawHtmlAsText, remarkMathMod.default],
        rehypePlugins: [rehypeKatexMod.default],
      }))
      .catch((err: unknown) => {
        // A review caught the first cut of this caching the REJECTED
        // promise forever on a transient failure (a network hiccup on
        // first load): every later math message would reuse that same
        // dead promise, with no retry for the rest of the session.
        // Clearing the cache here lets the next call start fresh.
        mathPluginsPromise = null;
        throw err;
      });
  }
  return mathPluginsPromise;
}

/** Loads remark-math/rehype-katex once `text` looks like it might
 * contain math, module-cached across every MarkdownText instance
 * (`loadMathPlugins`'s own memoized promise) so only the first message
 * in a session that needs math pays the import. A load failure leaves
 * `plugins` null (math renders as plain text for that message) rather
 * than throwing - `loadMathPlugins` itself resets its cache so the
 * next math-needing message gets a real retry, not a repeat of the
 * same dead promise. */
function useMathPlugins(text: string): MathPlugins | null {
  const needsMath = MATH_HINT.test(text);
  const [plugins, setPlugins] = useState<MathPlugins | null>(null);
  useEffect(() => {
    if (!needsMath || plugins) return;
    let cancelled = false;
    loadMathPlugins()
      .then((loaded) => {
        if (!cancelled) setPlugins(loaded);
      })
      .catch(() => {
        /* swallowed: loadMathPlugins already reset its cache for a retry */
      });
    return () => {
      cancelled = true;
    };
  }, [needsMath, plugins]);
  return plugins;
}

const rehypePluginsBase: Pluggable[] = [];
const streamdownSanitizeSchema = { tagNames: [] as string[], attributes: {} as Record<string, string[]> };

type MarkdownNode = { type: string; url?: string; value?: string; children?: MarkdownNode[] };
function rawHtmlAsText() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.type === "html") {
        node.type = "text";
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
const remarkPluginsWithoutRawHtml: Pluggable[] = [remarkGfm, rawHtmlAsText];
const remendOptions = { links: false, linkMode: "text-only" as const };
// PI-RENDER-01 (F1): a reply is model-written, and the model can be steered
// by untrusted text, so a markdown image is a zero-click way to send private
// data to any host (the browser fetches it). Streamdown's own `security`
// option (rehype-harden) is the control: images may only come from the hub's
// own proxy path, never a remote host and never a `data:` URL; an image that
// fails the check is replaced by "[Image blocked: <alt text>]". Exact trusted
// links remain clickable; unlisted destinations become visible plain text.
export const DEFAULT_ALLOWED_IMAGE_PREFIXES: readonly string[] = ["/api/answer-image/"];

export type MarkdownLinkContext = { message: ThreadMessage; messages: readonly ThreadMessage[] };
export type TrustedLinks = readonly string[] | ((context: MarkdownLinkContext) => readonly string[]);

function hubOrigin(): string {
  try {
    const o = globalThis.location?.origin;
    return o && o !== "null" ? o : "http://localhost";
  } catch {
    return "http://localhost";
  }
}
// STREAMING-TEXT-01: the streamed reply takes the streaming-text Element's
// look (its docs: each word fades in over 500 ms in blue, settles back to ink
// over 700 ms, a blue caret after the last word). That Element renders one
// plain <p> with no markdown, so the look rides Streamdown's own word spans:
// Streamdown stamps each new word with this name and a nonzero duration, and
// markdown-text.css draws the fade, tint and settle from those stamps (see
// its header for why that is transitions, not a keyframe).
export const STREAMING_TEXT_ANIMATION = { animation: "streamingText", duration: 500 } as const;

export type MarkdownPreprocessContext = { streaming: boolean };

export type MarkdownTextProps = Partial<TextMessagePartProps> & {
  components?: Parameters<typeof memoizeMarkdownComponents>[0];
  preprocess?: (text: string, context: MarkdownPreprocessContext) => string;
  remend?: RemendConfig;
  /** Path and local URL prefixes an image may load from. Remote hosts are
   * never allowed. */
  allowedImagePrefixes?: readonly string[];
  /** Exact URLs that may remain clickable for this reply. */
  trustedLinks?: TrustedLinks;
};

const useShallowStable = <T extends Record<string, unknown> | undefined>(
  value: T,
): T => {
  const ref = useRef(value);
  if (value !== ref.current) {
    const prev = ref.current;
    const stable =
      value !== undefined &&
      prev !== undefined &&
      Object.keys(prev).length === Object.keys(value).length &&
      Object.keys(value).every((key) => prev[key] === value[key]);
    if (!stable) ref.current = value;
  }
  return ref.current;
};

// The two `SyntaxHighlighter` slots MarkdownTextPrimitive calls for a
// fenced code block (`components.SyntaxHighlighter` as the default,
// `componentsByLanguage.mermaid.SyntaxHighlighter` for that one
// language - assistant-ui's own documented shape,
// `MarkdownTextPrimitiveProps.componentsByLanguage`'s own example).
// Neither uses the `components.Pre`/`Code` it's handed: `shiki-
// highlighter.tsx` and `mermaid-diagram.tsx` render their own
// containers. `useAuiState` reads the enclosing message's own status,
// the same "no re-highlight/re-render mid-stream" signal
// `NextChatPage.tsx`'s streaming indicator already keys off.
const MarkdownSyntaxHighlighter: FC<AuiSyntaxHighlighterProps> = ({
  language,
  code,
}) => {
  const streaming = useAuiState((s) => s.message.status?.type === "running");
  return (
    <Suspense fallback={<PendingCodeBlock code={code} />}>
      <LazySyntaxHighlighter code={code} language={language} streaming={streaming} />
    </Suspense>
  );
};

const MarkdownMermaid: FC<AuiSyntaxHighlighterProps> = ({ code }) => {
  const streaming = useAuiState((s) => s.message.status?.type === "running");
  return (
    <Suspense fallback={<PendingCodeBlock code={code} />}>
      <LazyMermaidDiagram code={code} streaming={streaming} />
    </Suspense>
  );
};

// Stable module-level identity, never recreated per render - matches
// MarkdownTextPrimitive's own componentsByLanguage prop exactly (no
// per-render allocation to memoize away).
const componentsByLanguage = { mermaid: { SyntaxHighlighter: MarkdownMermaid } };

function canonicalLink(url: string, origin: string): string {
  try { return new URL(url, origin).href; } catch { return url; }
}

function isHubLink(url: string): boolean {
  return (url.startsWith("/") && !url.startsWith("//")) || url.startsWith("./") || url.startsWith("../") || url.startsWith("#");
}

/** Removes unlisted markdown links before HTML rendering; the full URL stays
 * visible so a model cannot hide its destination behind trusted-looking text. */
function stripUntrustedLinks(trusted: ReadonlySet<string>, origin: string): Pluggable {
  return () => (tree: MarkdownNode) => {
    const walk = (node: MarkdownNode) => {
      const children = node.children;
      if (!children) return;
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i]!;
        if (child.type === "link" && child.url && !isHubLink(child.url) && !trusted.has(canonicalLink(child.url, origin))) {
          children.splice(i, 1, ...(child.children ?? []), { type: "text", value: ` (${child.url})` });
          i += (child.children?.length ?? 0);
          continue;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}

const MarkdownTextImpl: FC<MarkdownTextProps> = ({
  text: standaloneText,
  components,
  preprocess,
  remend = remendOptions,
  allowedImagePrefixes = DEFAULT_ALLOWED_IMAGE_PREFIXES,
  trustedLinks,
}) => {
  const origin = hubOrigin();
  const isStandalone = typeof standaloneText === "string";
  // `MarkdownText` is also used by standalone previews (docs, settings,
  // artifacts) where no assistant-ui Thread scope exists. Keep message
  // history optional; those callers get no conversation-derived trusted URLs.
  const message = useAuiState((s) => s.optional.message);
  const messages = useAuiState((s) => s.optional.thread?.messages);
  const resolvedTrustedLinks = typeof trustedLinks === "function"
    ? (message && messages ? trustedLinks({ message, messages }) : [])
    : trustedLinks ?? [];
  const trustedKey = resolvedTrustedLinks.join("\n");
  const trusted = useMemo(
    () => new Set(trustedKey ? trustedKey.split("\n").map((url) => canonicalLink(url, origin)) : []),
    [trustedKey, origin],
  );
  const trustedLinksForSecurity = useMemo(() => [...trusted], [trusted]);
  const imagePrefixKey = allowedImagePrefixes.join("\n");
  const security = useMemo(
    () => ({
      defaultOrigin: origin,
      allowedImagePrefixes: imagePrefixKey ? imagePrefixKey.split("\n") : [],
      allowedLinkPrefixes: ["/", "./", "../", `${origin}/`, ...trustedLinksForSecurity],
      allowDataImages: false,
    }),
    [imagePrefixKey, origin, trustedLinksForSecurity],
  );
  const linkSafety = useMemo(() => {
    return { enabled: true, onLinkCheck: (url: string) => trusted.has(canonicalLink(url, origin)) || isHubLink(url) };
  }, [trusted, origin]);
  // Only read to decide whether this message's own math plugins are
  // worth loading - MarkdownTextPrimitive reads the same part's text
  // again internally (its own useMessagePartText/useSmooth), so this
  // never becomes the source of truth for what renders.
  const partText = useAuiState((s) => (s.optional.part?.type === "text" ? s.optional.part.text : ""));
  const streaming = useAuiState((s) => s.optional.message?.status?.type === "running");
  const shouldAnimateInThread = useAuiState((s) =>
    s.optional.part?.type === "text" && s.optional.message?.role === "assistant" && s.optional.message.status?.type === "running",
  );
  const text = isStandalone ? standaloneText : partText;
  const shouldAnimate = !isStandalone && shouldAnimateInThread;
  const mathPlugins = useMathPlugins(text);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const markdownRemarkPlugins = useMemo(
    () => [...(mathPlugins?.remarkPlugins ?? remarkPluginsWithoutRawHtml), stripUntrustedLinks(trusted, origin)],
    [mathPlugins?.remarkPlugins, trusted, origin],
  );
  const rehypePlugins = mathPlugins?.rehypePlugins ?? rehypePluginsBase;
  const standaloneRehypePlugins = useMemo(() => [
    rehypeRaw,
    [rehypeSanitize, streamdownSanitizeSchema] as Pluggable,
    [harden, security] as Pluggable,
    ...rehypePlugins,
  ], [security, rehypePlugins]);
  const standaloneUrlTransform = useMemo(() => (url: string, key: string) => {
    if (key === "src") {
      return imagePrefixKey.split("\n").some((prefix) => url.startsWith(prefix)) ? url : undefined;
    }
    if (key === "href") {
      return trusted.has(canonicalLink(url, origin)) || isHubLink(url) ? url : undefined;
    }
    return url;
  }, [imagePrefixKey, trusted, origin]);

  const stableComponents = useShallowStable(components);
  const markdownComponents = useMemo(() => {
    const base = stableComponents
      ? { ...defaultComponents, ...memoizeMarkdownComponents(stableComponents) }
      : defaultComponents;
    return { ...base, SyntaxHighlighter: MarkdownSyntaxHighlighter } as StreamdownTextComponents;
  }, [stableComponents]);

  return (
    <Suspense fallback={<span className="aui-md" aria-label="Formatting message" />}>
      {isStandalone ? <Streamdown
        mode="static"
        parseIncompleteMarkdown={true}
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={standaloneRehypePlugins}
        urlTransform={standaloneUrlTransform}
        children={preprocess ? preprocess(preprocessMath(standaloneText), { streaming: false }) : preprocessMath(standaloneText)}
        className={mathPlugins ? "aui-md aui-md-with-math" : "aui-md"}
        components={markdownComponents}
        controls={false}
        linkSafety={linkSafety}
      /> : <LazyStreamdownTextPrimitive
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={rehypePlugins}
        preprocess={(text) => (preprocess ? preprocess(preprocessMath(text), { streaming }) : preprocessMath(text))}
        // Streamdown 2.7.0's memo comparator omits remarkPlugins/rehypePlugins;
        // this changes when the lazy math plugins arrive so the parser sees them.
        className={mathPlugins ? "aui-md aui-md-with-math" : "aui-md"}
        components={markdownComponents}
        componentsByLanguage={componentsByLanguage}
        controls={false}
        animated={shouldAnimate && !prefersReducedMotion ? STREAMING_TEXT_ANIMATION : false}
        caret={shouldAnimate ? "block" : undefined}
        remend={remend}
        linkSafety={linkSafety}
        security={security}
      />}
    </Suspense>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="aui-code-header-root border-border/50 bg-muted/50 mt-3 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">
        {language}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && (
          <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
        )}
        {isCopied && (
          <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
        )}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "aui-md-h5 mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "aui-md-h6 mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  // A reply's own inline link is exactly like a citation chip
  // (elements/sources.aui.tsx's own Source): never the current tab -
  // target/rel/referrerPolicy default here, exactly the same three
  // attributes, so a household member never loses their place in the
  // conversation by tapping a link inside a reply, and a linked site
  // learns nothing from the click but the click.
  a: ({ className, target = "_blank", rel = "noopener noreferrer", referrerPolicy = "no-referrer", href, title, ...props }) => (
    <a
      href={href}
      // PI-RENDER-01: the full address is one hover (or long press) away,
      // so a model-written label never hides where a link goes.
      title={title ?? (href && /^https?:/i.test(href) ? href : undefined)}
      className={cn(
        "aui-md-a text-primary hover:text-primary/80 underline underline-offset-2",
        className,
      )}
      target={target}
      rel={rel}
      referrerPolicy={referrerPolicy}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("aui-md-hr border-muted-foreground/20 my-3", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="aui-md-table-wrapper my-3 min-w-0 max-w-full overflow-x-auto">
      <table
        className={cn(
          "aui-md-table min-w-max border-separate border-spacing-0",
          className,
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th bg-muted px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td border-muted-foreground/20 border-s border-b px-3 py-1.5 text-start last:border-e [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li leading-relaxed", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("aui-md-strong font-semibold", className)}
      {...props}
    />
  ),
  sup: ({ className, ...props }) => (
    <sup
      className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});
