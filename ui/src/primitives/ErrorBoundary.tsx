import { i18n } from "@/kit/i18n"
import { Component, type ReactNode } from "react";
import { Button } from "@/kit/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to draw instead of the full recovery screen when the children throw. For one shell part (a player bar, a
   * banner) whose failure must not take the page down: `null` draws nothing and the rest of the app keeps working.
   * Left out, the boundary shows the whole-page recovery screen as before. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// The one place a thrown render error is ever caught (docs/UI.md > PWA:
// "handled once"). React's own default for an uncaught render error is
// to unmount the whole tree - a blank white page with nothing on screen
// but a stack trace in the console a parent will never see.
// `pwaBoot.ts`'s own boot watchdog only covers the FIRST render (its
// timeout is cleared by `BootConfirm`'s effect, which fires once); a
// throw during any LATER render - navigating into a page with a bug, a
// response shape a component didn't expect - was still uncaught before
// this. Wrapped around the whole app (App.tsx), not one page at a time:
// a bug in the shell itself (the sidebar, the router) needs the same
// recovery screen a bug in one page does.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error("MaiPai Home crashed while rendering", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="flex h-screen items-center justify-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-4">
            <h1 className="text-xl font-semibold">{i18n._({ id: "ui.Something went wrong", message: "Something went wrong" })}</h1>
            <p className="text-base text-muted-foreground">
              {i18n._({ id: "ui.MaiPai ran into a problem showing this page. Reloading usually fixes it.", message: "MaiPai ran into a problem showing this page. Reloading usually fixes it." })}
            </p>
            <Button onClick={() => window.location.reload()}>{i18n._({ id: "ui.Reload", message: "Reload" })}</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
