"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  type CodeHeaderProps,
  type SyntaxHighlighterProps as AuiSyntaxHighlighterProps,
  MarkdownTextPrimitive,
  escapeCurrencyDollars,
  normalizeMathDelimiters,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
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
import { useAuiState, type TextMessagePartProps } from "@assistant-ui/react";
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
  remarkMath: Pluggable;
  rehypeKatex: Pluggable;
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
        remarkMath: remarkMathMod.default,
        rehypeKatex: rehypeKatexMod.default,
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

const remarkPluginsBase: Pluggable[] = [remarkGfm];
const rehypePluginsBase: Pluggable[] = [];

type MarkdownTextProps = Partial<TextMessagePartProps> & {
  components?: Parameters<typeof memoizeMarkdownComponents>[0];
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

const MarkdownTextImpl: FC<MarkdownTextProps> = ({ components }) => {
  // Only read to decide whether this message's own math plugins are
  // worth loading - MarkdownTextPrimitive reads the same part's text
  // again internally (its own useMessagePartText/useSmooth), so this
  // never becomes the source of truth for what renders.
  const text = useAuiState((s) => (s.part.type === "text" ? s.part.text : ""));
  const mathPlugins = useMathPlugins(text);
  const remarkPlugins = useMemo(
    () => (mathPlugins ? [remarkGfm, mathPlugins.remarkMath] : remarkPluginsBase),
    [mathPlugins],
  );
  const rehypePlugins = useMemo(
    () => (mathPlugins ? [mathPlugins.rehypeKatex] : rehypePluginsBase),
    [mathPlugins],
  );

  const stableComponents = useShallowStable(components);
  const markdownComponents = useMemo(() => {
    const base = stableComponents
      ? { ...defaultComponents, ...memoizeMarkdownComponents(stableComponents) }
      : defaultComponents;
    return { ...base, SyntaxHighlighter: MarkdownSyntaxHighlighter };
  }, [stableComponents]);

  return (
    <MarkdownTextPrimitive
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      preprocess={preprocessMath}
      className="aui-md"
      components={markdownComponents}
      componentsByLanguage={componentsByLanguage}
      defer
    />
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
  a: ({ className, target = "_blank", rel = "noopener noreferrer", referrerPolicy = "no-referrer", ...props }) => (
    <a
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
    <div className="aui-md-table-wrapper my-3 overflow-x-auto">
      <table
        className={cn(
          "aui-md-table w-full border-separate border-spacing-0",
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
