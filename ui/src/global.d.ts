// A bare `import "foo.css"` needs no type at all, so it always passed
// without this; a dynamic `import("foo.css")` (CHAT-RICH-02's own lazy
// katex load) resolves it as a real module and needs one.
declare module "*.css";
