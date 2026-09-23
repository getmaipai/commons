import { createContext, useContext, useEffect, useState, type ComponentType, type Dispatch, type SetStateAction } from 'react';

/** `Header.tsx` is a fixed, props-less component - no children, no slot,
 * same as every other shadcndashboard piece used exactly as it ships.
 * A page that needs to put its own content in the header bar (a
 * conversation's title and actions, for one) has no ancestor-to-Header
 * relationship to pass a prop through - `FullLayout` renders `<Header
 * />` and `<Outlet />` as siblings, and the page lives inside the
 * Outlet. `HeaderExtraProvider` (mounted once, in FullLayout) plus
 * `useHeaderExtra` (called by a page, deep inside the Outlet) is the
 * lift-state-up shape this needs.
 *
 * The slot's value is a component TYPE, not a rendered element - the
 * same `ComponentType` shape `elements/thread.aui.tsx`'s own
 * `ComposerExtra` slot already uses, not by coincidence: a rendered
 * element is a fresh object identity every render, so a page passing
 * one straight into this context would re-set it every render,
 * re-rendering `FullLayout`'s whole subtree (Header and the page
 * both), reconstructing that same element again, and so on - a real
 * infinite-render risk, not a hypothetical one, caught designing this
 * rather than found live. A stable module-level component reference
 * has none of that: it renders itself with its own hooks, so this
 * slot only ever needs to be set once per page (mount) and cleared
 * once (unmount). Upstream has no such slot either (checked against
 * shadcndashboard's own main branch before writing this) - draft
 * issue in commons/ui/docs/dashboard-upstream.md. */
const HeaderExtraContext = createContext<{
  Left: ComponentType | undefined;
  setLeft: Dispatch<SetStateAction<ComponentType | undefined>>;
}>({ Left: undefined, setLeft: () => {} });

export function HeaderExtraProvider({ children }: { children: React.ReactNode }) {
  const [Left, setLeft] = useState<ComponentType | undefined>(undefined);
  return (
    <HeaderExtraContext.Provider value={{ Left, setLeft }}>
      {children}
    </HeaderExtraContext.Provider>
  );
}

export function useHeaderExtraLeft(): ComponentType | undefined {
  return useContext(HeaderExtraContext).Left;
}

/** Sets the header's left-side extra content to the given component
 * for as long as the calling page stays mounted; clears it on
 * unmount, so navigating to a page that never calls this leaves the
 * header exactly as shipped. Pass a stable component reference (a
 * module-level function, never an inline one) - see this file's own
 * comment for why. */
export function useHeaderExtra(Component: ComponentType | undefined): void {
  const { setLeft } = useContext(HeaderExtraContext);
  useEffect(() => {
    setLeft(() => Component);
    return () => setLeft(undefined);
  }, [Component, setLeft]);
}
