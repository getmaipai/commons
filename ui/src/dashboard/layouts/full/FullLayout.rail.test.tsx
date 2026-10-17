import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout from "./FullLayout";
import { TooltipProvider } from "../../components/ui/tooltip";
import AppRail, { isRailItemActive, railHref } from "./vertical/rail/AppRail";
import RailProfileMenu from "./vertical/rail/RailProfileMenu";
import { useHeaderExtra } from "./vertical/header/HeaderExtraContext";

afterEach(cleanup);

function Titled() {
  useHeaderExtra(PageTitle);
  return <div>Page</div>;
}
function PageTitle() {
  return <span>Settings</span>;
}

function renderRail(path: string, profile = <RailProfileMenu displayName="Sage Willow" subtitle="Owner" helpHref="/help" onLogout={() => {}} />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Routes>
          <Route element={<FullLayout rail railProfile={profile} />}>
            <Route path="/" element={<div>Home</div>} />
            <Route path="/chat" element={<div>Chat</div>} />
            <Route path="/settings" element={<Titled />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("RAIL-01 app rail", () => {
  test("shell rail renders data-tour when tourId is set; renders no data-tour attribute otherwise", () => {
    const view = render(<MemoryRouter><TooltipProvider><AppRail tourId="shell.rail" /></TooltipProvider></MemoryRouter>);
    expect(view.getByRole("navigation", { name: "Primary navigation" }).getAttribute("data-tour")).toBe("shell.rail");
    cleanup();
    const plain = render(<MemoryRouter><TooltipProvider><AppRail /></TooltipProvider></MemoryRouter>);
    expect(plain.getByRole("navigation", { name: "Primary navigation" }).hasAttribute("data-tour")).toBe(false);
  });

  test("FullLayout passes rail and per-item tour ids to AppRail", () => {
    const view = render(
      <MemoryRouter><TooltipProvider><Routes>
        <Route element={<FullLayout rail railTourId="shell.rail" railItemTourId={(item) => item.name === "Chat" ? "rail.chat" : undefined} />}>
          <Route path="/" element={<div>Home</div>} />
        </Route>
      </Routes></TooltipProvider></MemoryRouter>,
    );
    expect(view.getByRole("navigation", { name: "Primary navigation" }).getAttribute("data-tour")).toBe("shell.rail");
    expect(view.getByRole("link", { name: "Chat" }).getAttribute("data-tour")).toBe("rail.chat");
  });

  test("a 56px rail with each app named, the current one marked, Search and the profile at the foot", () => {
    const view = renderRail("/chat");
    const rail = view.getByRole("navigation", { name: "Primary navigation" });
    expect(rail.className).toContain("w-[var(--rail-width,56px)]");
    for (const name of ["Home", "Chat", "Library", "Family"]) expect(view.getByRole("link", { name })).toBeTruthy();
    expect(view.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
    expect(view.getByRole("button", { name: "Search" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Open profile menu for Sage Willow" })).toBeTruthy();
  });

  // Owner, 2026-10-06: "replace the upper left logo with the home button".
  test("the brand mark is the one Home destination, at the top, selected on Home", () => {
    const view = renderRail("/");
    expect(view.getAllByRole("link", { name: "Home" })).toHaveLength(1);
    const home = view.getByRole("link", { name: "Home" });
    expect(home.getAttribute("data-slot")).toBe("app-rail-home");
    expect(home.getAttribute("aria-current")).toBe("page");
    expect(home.querySelector("img")).not.toBeNull();
    const first = view.getByRole("navigation", { name: "Primary navigation" }).querySelector("a");
    expect(first === home).toBe(true);
    expect(view.container.querySelectorAll('[data-slot="app-rail-item"]')).toHaveLength(3);
  });

  // Owner, 2026-10-06: "clicking anything in the left rail flashes the
  // entire app". The rail linked to /next/..., which the host redirects,
  // remounting its whole shell; it links to the bare path now.
  test("rail links go straight to the app's own path, never the /next redirect", () => {
    const view = renderRail("/chat");
    const hrefs = [...view.getByRole("navigation", { name: "Primary navigation" }).querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/chat", "/files", "/people"]);
    expect(railHref("/next")).toBe("/");
    expect(railHref("/next/chat")).toBe("/chat");
    expect(railHref("/nextcloud")).toBe("/nextcloud");
  });

  test("a nested path keeps its app selected; Home matches only itself", () => {
    expect(isRailItemActive("/people/abc", "/next/people")).toBe(true);
    expect(isRailItemActive("/chat", "/next")).toBe(false);
    expect(isRailItemActive("/", "/next")).toBe(true);
  });

  test("a host can keep a selected app while the route is in Settings", () => {
    const view = render(
      <MemoryRouter initialEntries={["/settings/account/profile"]}>
        <TooltipProvider>
          <Routes>
            <Route element={<FullLayout rail activeAppHref="/chat" />}>
              <Route path="/settings/*" element={<div>Settings</div>} />
            </Route>
          </Routes>
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(view.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
    expect(view.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  test("the page header renders only when a page places content in it", () => {
    expect(renderRail("/chat").container.querySelector("header")).toBeNull();
    cleanup();
    expect(renderRail("/settings").container.querySelector('header[data-slot="rail-page-header"]')?.textContent).toBe("Settings");
  });

  test("the profile menu names the person and lists the utility rows with their state", async () => {
    const onIncognito: boolean[] = [];
    const view = renderRail(
      "/chat",
      <RailProfileMenu
        displayName="Sage Willow"
        subtitle="Owner"
        notifications={{ count: 2, onOpen: () => {} }}
        status={{ label: "Degraded", level: "degraded", href: "/status" }}
        incognito={{ on: false, onChange: (on) => onIncognito.push(on) }}
        helpHref="/help"
        onLogout={() => {}}
      />,
    );
    const trigger = view.getByRole("button", { name: /Open profile menu for Sage Willow \(2 notifications, System: degraded\)/ });
    expect(view.container.querySelector('[data-slot="rail-profile-badge"]')?.textContent).toBe("2");
    fireEvent.click(trigger);
    await waitFor(() => expect(view.getByRole("menuitem", { name: /Notifications/ })).toBeTruthy());
    expect(view.getByRole("menuitem", { name: /System status/ }).textContent).toContain("Degraded");
    expect(view.getByRole("menuitem", { name: /Settings/ })).toBeTruthy();
    expect(view.getByRole("menuitem", { name: /Help/ })).toBeTruthy();
    expect(view.getByRole("menuitem", { name: /Log out/ })).toBeTruthy();
    const incognito = view.getByRole("menuitem", { name: /Incognito/ });
    expect(incognito.textContent).toContain("Off");
    fireEvent.click(incognito);
    expect(onIncognito).toEqual([true]);
  });

  test("a status problem alone shows the attention dot, not a count", () => {
    const view = renderRail("/chat", <RailProfileMenu displayName="Sage" status={{ label: "Something is down", level: "offline", href: "/status" }} />);
    expect(view.container.querySelector('[data-slot="rail-profile-dot"]')).not.toBeNull();
    expect(view.container.querySelector('[data-slot="rail-profile-badge"]')).toBeNull();
  });

  // Owner, 2026-10-06: a status indicator in the rail. Calm: no dot when
  // all is well, amber when degraded, red only when down; the count badge
  // stays for notifications and both can show at once.
  test("the avatar's status dot is calm when all is well and names the system state", () => {
    const at = (level: "online" | "maintenance" | "degraded" | "offline", count = 0) => {
      cleanup();
      const view = renderRail("/chat", <RailProfileMenu displayName="Sage" notifications={{ count, onOpen: () => {} }} status={{ label: "x", level, href: "/status" }} />);
      const dot = view.container.querySelector('[data-slot="rail-profile-dot"]');
      const trigger = view.container.querySelector('[data-slot="rail-profile-trigger"]');
      return { dot, label: trigger?.getAttribute("aria-label"), badge: view.container.querySelector('[data-slot="rail-profile-badge"]') };
    };
    expect(at("online").dot).toBeNull();
    expect(at("online").label).toBe("Open profile menu for Sage (System: all good)");
    expect(at("maintenance").dot).toBeNull();
    const degraded = at("degraded");
    expect(degraded.dot?.getAttribute("data-level")).toBe("degraded");
    expect(degraded.dot?.className).toContain("--status-warning");
    expect(degraded.dot?.className).toContain("bottom-1");
    const down = at("offline", 3);
    expect(down.dot?.className).toContain("--status-error");
    expect(down.badge?.textContent).toBe("3");
    expect(down.label).toBe("Open profile menu for Sage (3 notifications, System: down)");
  });
});

describe("LEFTNAV-APPS-01 pinned apps and the launcher", () => {
  const app = (id: string, pinned: boolean, name = id[0]!.toUpperCase() + id.slice(1)) => ({ name, url: `/apps/${id}`, icon: id === "weather" ? "cloud-sun" : "layout-grid", pinned });
  function renderApps(path: string, apps: ReturnType<typeof app>[], onToggle = (_u: string, _p: boolean) => {}) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <TooltipProvider><AppRail apps={apps} onTogglePin={onToggle} /></TooltipProvider>
      </MemoryRouter>,
    );
  }

  test("without apps the rail has no pinned section and no launcher", () => {
    const view = render(<MemoryRouter><TooltipProvider><AppRail /></TooltipProvider></MemoryRouter>);
    expect(view.container.querySelector('[data-slot="app-rail-apps"]')).toBeNull();
    expect(view.queryByRole("button", { name: "All apps" })).toBeNull();
  });

  test("a pinned app is a named link in the rail and the open one is marked", () => {
    const view = renderApps("/apps/weather", [app("weather", true), app("notes", false)]);
    const link = view.getByRole("link", { name: "Weather" });
    expect(link.getAttribute("href")).toBe("/apps/weather");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.hasAttribute("data-active")).toBe(true);
    expect(view.queryByRole("link", { name: "Notes" })).toBeNull();
  });

  test("at most six pinned apps draw in the rail", () => {
    const apps = Array.from({ length: 8 }, (_, i) => app(`app${i}`, true));
    const view = renderApps("/", apps);
    expect(view.container.querySelectorAll('[data-slot="app-rail-app"]').length).toBe(6);
  });

  test("the launcher lists every app and pins or unpins one", async () => {
    const calls: Array<[string, boolean]> = [];
    const view = renderApps("/", [app("weather", true), app("notes", false)], (url, pinned) => calls.push([url, pinned]));
    fireEvent.click(view.getByRole("button", { name: "All apps" }));
    await waitFor(() => view.getByRole("button", { name: "Pin Notes to the rail" }));
    fireEvent.click(view.getByRole("button", { name: "Pin Notes to the rail" }));
    fireEvent.click(view.getByRole("button", { name: "Unpin Weather from the rail" }));
    expect(calls).toEqual([["/apps/notes", true], ["/apps/weather", false]]);
  });

  test("a seventh app cannot be pinned while six are", async () => {
    const apps = [...Array.from({ length: 6 }, (_, i) => app(`app${i}`, true)), app("extra", false)];
    const view = renderApps("/", apps);
    fireEvent.click(view.getByRole("button", { name: "All apps" }));
    const pin = await waitFor(() => view.getByRole("button", { name: /Pin Extra to the rail/ }));
    expect((pin as HTMLButtonElement).disabled).toBe(true);
  });
});
