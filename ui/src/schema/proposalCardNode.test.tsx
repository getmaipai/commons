// UI-BLOCKS-01: the `proposal_card` node maps the bound proposal row and its picture rows to the kit ProposalCard, keeps the edited description in page state and runs its three actions.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { calls, fixtureNode, hub, mountBlock } from "../../tests/blockHarness";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SchemaPage } from "@/kit/schema/SchemaPage";
import { PageNodeSchema, ProposalCardNodeSchema } from "@/kit/schema/types";

const realMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;
beforeEach(() => stubMatchMedia({}));
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia; globalThis.fetch = originalFetch; });

const proposal = { id: "p1", name: "Willow", description: "A calm gardener with a lantern.", status: "ready", note: "A match is a guess, not proof.", error: null };
const pictures = [
  { picture: { url: "/media/w1.jpg" }, alt: "Willow in a garden", source: "from_photo", caption: "Front" },
  { picture: { url: "/media/w2.jpg" }, alt: "Willow at dusk", source: "guessed" },
  { picture: { url: "https://elsewhere.example.com/w3.jpg" }, alt: "Not from here", source: "guessed" },
];
const node = (change: Record<string, unknown> = {}) => fixtureNode("proposal-card.json", change);
const mount = (change: Record<string, unknown> = {}, state: Record<string, unknown> = { proposal: "p1" }) => mountBlock(node(change), { packageId: "characters", state });
const press = (view: ReturnType<typeof mount>, name: string) => view.getByRole("button", { name }) as HTMLButtonElement;

describe("proposal_card node", () => {
  test("the example page parses, and a card with no pictures bind is refused", () => {
    const parsed = ProposalCardNodeSchema.parse(node());
    expect(parsed.description_state).toBe("description");
    expect(ProposalCardNodeSchema.safeParse({ ...parsed, pictures: undefined }).success).toBe(false);
    expect(PageNodeSchema.safeParse({ type: "page", id: "p", title: "P", body: [{ ...parsed, status: undefined }] }).success).toBe(false);
  });

  test("draws the bound title, description, note and the pictures that are from this origin, with their badges", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    expect(await view.findByRole("heading", { name: "Willow" })).toBeTruthy();
    expect(view.getByText("A calm gardener with a lantern.")).toBeTruthy();
    expect(view.getByText("A match is a guess, not proof.")).toBeTruthy();
    await waitFor(() => expect(view.container.querySelectorAll('[data-slot="proposal-card-picture"]')).toHaveLength(2));
    expect(view.getByText("Matches your photo")).toBeTruthy();
    expect(view.getByText("Guessed by MaiPai")).toBeTruthy();
    expect(view.getByText("Front")).toBeTruthy();
    expect(view.getByRole("button", { name: "Approve" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Change" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Discard" })).toBeTruthy();
  });

  test("the page's params reach both data calls", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    const asked = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls.map(([url, init]) => [url, JSON.parse(String(init.body))]);
    expect(asked).toContainEqual(["/api/plugins/characters/data/proposal", { id: "p1" }]);
    expect(asked).toContainEqual(["/api/plugins/characters/data/proposal-pictures", { id: "p1" }]);
  });

  test("description_state is seeded with the row's description", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    await waitFor(() => expect(view.state().description).toBe("A calm gardener with a lantern."));
  });

  test("a new description from the server (another guess) replaces the text, an unchanged one keeps an edit", async () => {
    let current = proposal;
    hub({ proposal: () => [current], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    await waitFor(() => expect(view.state().description).toBe("A calm gardener with a lantern."));
    fireEvent.click(view.getByRole("button", { name: "Edit description" }));
    fireEvent.change(view.getByLabelText("Description"), { target: { value: "My own words." } });
    // Any action refetches the page's data; the same server text must not undo the edit.
    fireEvent.click(view.getByRole("button", { name: "Change" }));
    await waitFor(() => expect(calls.some((c) => c.url.includes("/change/"))).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(view.state().description).toBe("My own words.");
    current = { ...proposal, description: "A shy gardener with a kite." };
    fireEvent.click(view.getByRole("button", { name: "Change" }));
    await waitFor(() => expect(view.state().description).toBe("A shy gardener with a kite."));
  });

  test("on a package page the edited description stays out of the address", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const page = { type: "page", id: "new", title: "New", body: [node()] };
    let search = "";
    function Probe() { search = useLocation().search; return null; }
    const view = renderWithQueryClient(
      <MemoryRouter initialEntries={["/apps/characters/new?proposal=p1"]}>
        <Probe />
        <SchemaPage page={page as never} packageId="characters" />
      </MemoryRouter>,
    );
    await view.findByRole("heading", { name: "Willow" });
    fireEvent.click(await view.findByRole("button", { name: "Edit description" }));
    fireEvent.change(view.getByLabelText("Description"), { target: { value: "Words that must not leak." } });
    await new Promise((r) => setTimeout(r, 50));
    expect(search).toBe("?proposal=p1");
  });

  test("Edit opens a text box; typing writes the page state, and Approve sends that text under the state name", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    await waitFor(() => expect(press(view, "Approve").disabled).toBe(false));
    fireEvent.click(view.getByRole("button", { name: "Edit description" }));
    const box = view.getByLabelText("Description") as HTMLTextAreaElement;
    expect(box.value).toBe("A calm gardener with a lantern.");
    fireEvent.change(box, { target: { value: "A calm gardener who whistles." } });
    expect(view.state().description).toBe("A calm gardener who whistles.");
    fireEvent.click(press(view, "Approve"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/characters/approve/p1")).toBe(true));
    expect(calls.find((c) => c.url.includes("/approve/"))!.body).toEqual({ description: "A calm gardener who whistles." });
    await waitFor(() => expect(view.where().path).toBe("/apps/characters"));
  });

  test("without description_state the description is read only", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount({ description_state: undefined });
    await view.findByRole("heading", { name: "Willow" });
    expect(view.queryByRole("button", { name: "Edit description" })).toBeNull();
    fireEvent.click(press(view, "Change"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/characters/change/p1")).toBe(true));
    expect(calls.find((c) => c.url.includes("/change/"))!.body).toEqual({ description: "A calm gardener with a lantern." });
  });

  test("disabled_when reads the description: an emptied text box turns Approve off", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    await waitFor(() => expect(press(view, "Approve").disabled).toBe(false));
    fireEvent.click(view.getByRole("button", { name: "Edit description" }));
    fireEvent.change(view.getByLabelText("Description"), { target: { value: "" } });
    await waitFor(() => expect(press(view, "Approve").disabled).toBe(true));
  });

  test("Discard asks first (a confirm action), then calls with the row's id", async () => {
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const view = mount();
    await view.findByRole("heading", { name: "Willow" });
    fireEvent.click(press(view, "Discard"));
    await view.findByText("Discard this proposal?");
    expect(calls.filter((c) => c.url.includes("/discard/"))).toEqual([]);
    fireEvent.click(view.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/plugins/characters/discard/p1")).toBe(true));
    expect(calls.find((c) => c.url.includes("/discard/"))!.method).toBe("DELETE");
  });

  test("status making: placeholder pictures and every button waits; saving shows Saving", async () => {
    hub({ proposal: [{ ...proposal, status: "making" }], "proposal-pictures": [] });
    const making = mount();
    await making.findByText("Making the pictures");
    for (const name of ["Approve", "Change", "Discard"]) expect(press(making, name).disabled).toBe(true);
    cleanup();
    hub({ proposal: [{ ...proposal, status: "saving" }], "proposal-pictures": pictures });
    const saving = mount();
    await saving.findByText("Saving");
    for (const name of ["Change", "Discard"]) expect(press(saving, name).disabled).toBe(true);
  });

  test("the server's error line shows, and a failed action says why when the row has none", async () => {
    hub({ proposal: [{ ...proposal, error: "The pictures could not be made. Press Change to try again." }], "proposal-pictures": pictures });
    const withError = mount();
    expect((await withError.findByRole("alert")).textContent).toContain("The pictures could not be made. Press Change to try again.");
    cleanup();
    hub({ proposal: [proposal], "proposal-pictures": pictures });
    const answer = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/change/")
      ? Promise.resolve(new Response(JSON.stringify({ error: "Could not make another guess. Try again in a minute." }), { status: 503 }))
      : answer(input, init)) as typeof fetch;
    const failing = mount();
    await failing.findByRole("heading", { name: "Willow" });
    fireEvent.click(press(failing, "Change"));
    expect((await failing.findByRole("alert")).textContent).toContain("Could not make another guess. Try again in a minute.");
  });

  test("loading draws the kit's loading line, not the card", async () => {
    hub({ proposal: "hang", "proposal-pictures": [] });
    const view = mount();
    await view.findByRole("status", { name: "Loading" }).catch(() => null);
    expect(view.container.querySelector('[data-slot="proposal-card"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  test("an answer with no row draws nothing", async () => {
    hub({ proposal: [], "proposal-pictures": [] });
    const view = mount();
    await waitFor(() => expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(view.container.querySelector('[data-slot="proposal-card"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  test("a failed call offers Try again", async () => {
    hub({ proposal: "fail", "proposal-pictures": [] });
    const view = mount();
    await view.findByText("Something went wrong.");
    expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
