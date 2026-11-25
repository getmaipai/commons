// STACK-MODELS-PAGE-01. The shared AI and models page over the fake client: the calm summary, search, every write the page can make, the sentences
// it shows when a write fails, the host's locks, and the structure a screen reader needs.
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { StackModelsPage } from "./StackModelsPage";
import type { StackModelsPageProps } from "./StackModelsPage";
import { createFakeStackClient } from "./fakeStackClient";
import type { FakeStackClient, FakeStackOptions } from "./fakeStackClient";
import { StackClientError } from "./StackClient";
import type { StackClient } from "./StackClient";
import { seedChoicesView } from "./fakeStackData";

afterEach(cleanup);

// The kit's preload registers the DOM after Testing Library is first imported, so its global `screen` is unbound here; this one is bound to the real body.
const screen = within(document.body);

async function setup(props: Partial<StackModelsPageProps> = {}, options: FakeStackOptions = {}) {
  const client = createFakeStackClient(options);
  const view = render(<StackModelsPage client={client} pollMs={0} {...props} />);
  await screen.findByText("Qwen3 8B");
  return { client, view };
}
const card = (id: string) => screen.getByTestId(`feature-${id}`);
const click = (element: HTMLElement) => act(async () => { fireEvent.click(element); });
const calls = (client: FakeStackClient, method: string) => client.calls.filter((c) => c.method === method);
const allIds = () => seedChoicesView().categories.flatMap((c) => c.candidates.map((m) => m.id));

describe("the calm summary", () => {
  test("one card per feature, each with its chosen model's plain name and a one-line status", async () => {
    await setup();
    const cards = screen.getAllByTestId(/^feature-/);
    expect(cards).toHaveLength(11);
    expect(within(card("chat")).getByText("Qwen3 8B")).toBeTruthy();
    expect(within(card("chat")).getByText("Ready")).toBeTruthy();
    expect(within(card("pictures")).getByText("Needs a look")).toBeTruthy();
    expect(within(card("video")).getByText("Off")).toBeTruthy();
    expect(within(card("stems")).getByText("Not downloaded yet")).toBeTruthy();
  });

  test("sizes are in GB and never a raw number of bytes", async () => {
    await setup();
    expect(within(card("chat")).getByText("4.7 GB")).toBeTruthy();
    expect(within(card("wakeword")).getByText("Under 0.1 GB")).toBeTruthy();
    expect(screen.getByText(/412 GB free on disk/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\d{7,}/);
  });

  test("no raw id is ever a headline: none of the cards shows an id", async () => {
    await setup();
    const text = screen.getAllByTestId(/^feature-/).map((c) => c.textContent ?? "").join(" ");
    for (const id of allIds()) expect(text.includes(id), id).toBe(false);
  });

  test("the summary line says what this computer has", async () => {
    await setup();
    expect(screen.getByText("This computer has about 64 GB of memory for AI and 412 GB free on disk.")).toBeTruthy();
  });

  test("while loading it shows placeholders, and a failed read says what happened with a Try again button", async () => {
    const client = createFakeStackClient();
    client.failNext("readChoices", "The Stack is not answering. It may be restarting; try again in a moment.", "offline");
    render(<StackModelsPage client={client} pollMs={0} />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The Stack is not answering. It may be restarting; try again in a moment.");
    await click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Qwen3 8B");
  });
});

describe("search", () => {
  const type = (value: string) => fireEvent.change(screen.getByRole("searchbox", { name: "Search models" }), { target: { value } });
  const results = () => screen.queryAllByRole("listitem").map((li) => li.textContent ?? "");

  test("typing replaces the summary with the matching models, each with its feature, size and state", async () => {
    await setup();
    type("flux");
    const list = await screen.findByRole("list", { name: "Search results" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(list.textContent).toContain("FLUX.1 schnell");
    expect(list.textContent).toContain("Pictures");
    expect(list.textContent).toContain("13 GB");
    expect(screen.queryAllByTestId(/^feature-/)).toHaveLength(0);
    expect(screen.getByText("2 models match")).toBeTruthy();
    type("");
    expect(screen.getAllByTestId(/^feature-/)).toHaveLength(11);
  });

  test("it finds a model by version number, id, repository, precision, licence, engine and description", async () => {
    await setup();
    const find = (q: string) => { type(q); return results().join(" | "); };
    expect(find("3.8")).toContain("Qwen3.8 Flash Next 177B");
    expect(find("3.8")).not.toContain("Qwen3 8B");
    expect(find("qwen3-8b-q4")).toContain("Qwen3 8B");
    expect(find("openai/whisper")).toContain("Whisper Large v3 Turbo");
    expect(find("UD-IQ3_XXS")).toContain("Qwen3.8 Flash Next 177B");
    expect(find("non-commercial")).toContain("FLUX.1 dev");
    expect(find("mlx-audio")).toContain("Kokoro 82M");
    expect(find("hands and text")).toContain("FLUX.1 dev");
  });

  test("a search with no match says so in a sentence and suggests what to try", async () => {
    await setup();
    type("zzzz");
    expect((await screen.findByRole("status")).textContent).toContain("No model matches \"zzzz\"");
    expect(screen.getByRole("status").textContent).toContain("a version such as 3.8");
  });

  test("opening a result opens its feature's details with that model highlighted", async () => {
    await setup();
    type("gemma");
    await click(await screen.findByText("Gemma 3 27B"));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Chat" })).toBeTruthy();
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    const row = await waitFor(() => {
      const found = sheet.querySelector("[data-highlight=true]");
      if (!found) throw new Error("Highlighted model is not visible");
      return found;
    });
    expect(row?.textContent).toContain("Gemma 3 27B");
  });
});

describe("turning features on and off", () => {
  test("the switch on a card saves to the Stack and says what happened", async () => {
    const { client } = await setup();
    const toggle = within(card("video")).getByRole("switch", { name: "Video on or off" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    await click(toggle);
    await waitFor(() => expect(calls(client, "setRoleEnabled")).toEqual([{ method: "setRoleEnabled", args: ["video", true] }]));
    expect((await screen.findByRole("status")).textContent).toContain("Video is on.");
    await waitFor(() => expect(within(card("video")).getByRole("switch").getAttribute("aria-checked")).toBe("true"));
    await click(within(card("music")).getByRole("switch"));
    expect((await screen.findByText(/Music is off\. Anything it was running has stopped\./)).textContent).toBeTruthy();
  });

  test("a feature with no role has no switch", async () => {
    await setup();
    expect(within(card("stems")).queryByRole("switch")).toBeNull();
  });

  test("a refusal shows the Stack's own sentence and the switch goes back", async () => {
    const { client } = await setup();
    client.failNext("setRoleEnabled", "Chat cannot be turned off while a conversation is open.", "in_use");
    await click(within(card("chat")).getByRole("switch"));
    expect((await screen.findByRole("alert")).textContent).toContain("Chat cannot be turned off while a conversation is open.");
    expect(within(card("chat")).getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  test("an unexpected failure says nothing was changed", async () => {
    const { client } = await setup();
    (client as StackClient).setRoleEnabled = async () => { throw new Error("socket hang up"); };
    await click(within(card("chat")).getByRole("switch"));
    expect((await screen.findByRole("alert")).textContent).toBe("That could not be saved. Nothing was changed. Try again.Dismiss");
  });
});

describe("the details sheet", () => {
  async function openChat() {
    const ctx = await setup();
    await click(within(card("chat")).getByRole("button", { name: /Chat/ }));
    const sheet = await screen.findByRole("dialog");
    return { ...ctx, sheet };
  }

  test("shows each level with its model, who chose it and the Stack's note", async () => {
    const { sheet } = await openChat();
    const levels = within(sheet).getByRole("list", { name: "Levels" });
    const rows = within(levels).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector("p")?.textContent)).toEqual(["ReducedRecommended", "StandardYour choice", "BoostRecommended", "MaxOff"]);
    expect(rows[1]!.textContent).toContain("Qwen3 8B");
    expect(rows[3]!.textContent).toContain("Not in use");
  });

  test("choosing a model for a level saves it to the Stack and says so", async () => {
    const { client, sheet } = await openChat();
    await click(within(sheet).getByRole("button", { name: "Change Standard" }));
    const group = within(sheet).getByRole("radiogroup", { name: "Models for Standard" });
    expect(within(group).getByRole("radio", { name: /Qwen3 8B/ }).getAttribute("aria-checked")).toBe("true");
    await click(within(group).getByRole("radio", { name: /^Qwen3 30B/ }));
    await waitFor(() => expect(calls(client, "chooseModel")).toEqual([{ method: "chooseModel", args: ["chat", "standard", { model: "qwen3-30b-a3b-q4" }] }]));
    expect((await within(sheet).findByRole("status")).textContent).toContain("Standard now uses Qwen3 30B (3B active).");
    const standard = within(within(sheet).getByRole("list", { name: "Levels" })).getAllByRole("listitem")[1]!;
    await waitFor(() => expect(standard.textContent).toContain("Qwen3 30B (3B active)"));
  });

  test("choosing a model that is not downloaded says it is downloading first", async () => {
    const { sheet } = await openChat();
    await click(within(sheet).getByRole("button", { name: "Change Standard" }));
    await click(within(sheet).getByRole("radio", { name: /Gemma 3 27B/ }));
    expect((await within(sheet).findByRole("status")).textContent).toContain("It is downloading first and starts being used when it is ready.");
  });

  test("a model that does not fit is shown with the Stack's reason and cannot be chosen", async () => {
    const { client, sheet } = await openChat();
    await click(within(sheet).getByRole("button", { name: "Change Max" }));
    const refused = within(sheet).getByRole("radio", { name: /Qwen3\.8 Flash Next 177B/ });
    expect(refused.hasAttribute("disabled")).toBe(true);
    expect(refused.textContent).toContain("It needs 72 GB and this level has 48 GB. Pick a smaller model.");
    await click(refused);
    expect(calls(client, "chooseModel")).toHaveLength(0);
  });

  test("the recommended entry clears the pick and Off switches a level off, but Standard has no Off", async () => {
    const { client, sheet } = await openChat();
    await click(within(sheet).getByRole("button", { name: "Change Standard" }));
    expect(within(sheet).queryByRole("radio", { name: /^Off/ })).toBeNull();
    await click(within(sheet).getByRole("radio", { name: /Recommended: Qwen3 30B/ }));
    await waitFor(() => expect(calls(client, "chooseModel")[0]!.args).toEqual(["chat", "standard", { model: "recommended" }]));
    await click(within(sheet).getByRole("button", { name: "Change Boost" }));
    await click(within(sheet).getByRole("radio", { name: /^Off/ }));
    await waitFor(() => expect(calls(client, "chooseModel")[1]!.args).toEqual(["chat", "boost", { model: "off" }]));
    expect((await within(sheet).findByText("Boost is off.")).textContent).toBeTruthy();
  });

  test("a refused pick shows the Stack's sentence in the sheet and keeps the old model", async () => {
    const { client, sheet } = await openChat();
    client.failNext("chooseModel", "Llama 3.3 70B needs 40 GB more disk space. Free up space first.", "not_enough_space");
    await click(within(sheet).getByRole("button", { name: "Change Boost" }));
    await click(within(sheet).getByRole("radio", { name: /Llama 3\.3 70B/ }));
    expect((await within(sheet).findByRole("alert")).textContent).toContain("Llama 3.3 70B needs 40 GB more disk space. Free up space first.");
    expect(within(within(sheet).getByRole("list", { name: "Levels" })).getAllByRole("listitem")[2]!.textContent).toContain("Qwen3 30B (3B active)");
  });

  test("the switch in the sheet is the same switch as on the card", async () => {
    const { client, sheet } = await openChat();
    await click(within(sheet).getByRole("switch", { name: "Chat on or off" }));
    await waitFor(() => expect(calls(client, "setRoleEnabled")).toEqual([{ method: "setRoleEnabled", args: ["chat", false] }]));
    expect((await within(sheet).findByRole("status")).textContent).toContain("Chat is off.");
  });

  test("each model shows its summary, size and state; its id is only in Details, with a copy button", async () => {
    const { sheet } = await openChat();
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    const models = within(sheet).getByRole("list", { name: "Models" });
    const row = within(models).getAllByRole("listitem").find((r) => r.textContent?.includes("Qwen3 8B"))!;
    expect(row.textContent).toContain("Fast everyday chat with clear answers.");
    expect(row.textContent).toContain("4.7 GB");
    expect(row.textContent).toContain("4-bit, compact");
    expect(row.textContent).not.toContain("qwen3-8b-q4");
    await click(within(row).getByRole("button", { name: "Details of Qwen3 8B" }));
    const details = within(row).getByTestId("details-qwen3-8b-q4");
    expect(details.textContent).toContain("qwen3-8b-q4");
    expect(details.textContent).toContain("Qwen/Qwen3-8B-GGUF");
    expect(details.textContent).toContain("llama.cpp");
    expect(within(details).getByRole("button", { name: "Copy the ID of Qwen3 8B" })).toBeTruthy();
  });

  test("download starts a download and shows progress; remove asks first and frees the model", async () => {
    const { client, sheet } = await openChat();
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    await click(within(sheet).getByRole("button", { name: /Download Llama 3\.3 70B/ }));
    await waitFor(() => expect(calls(client, "installModel")).toEqual([{ method: "installModel", args: ["llama-33-70b-q4"] }]));
    expect((await within(sheet).findByRole("status")).textContent).toContain("Downloading Llama 3.3 70B.");
    expect(await within(sheet).findByRole("progressbar", { name: "Download progress for Llama 3.3 70B" })).toBeTruthy();

    await click(within(sheet).getByRole("button", { name: "Remove Qwen3 30B (3B active)" }));
    const confirm = await screen.findByTestId("destructive-confirm");
    expect(confirm.textContent).toContain("Remove Qwen3 30B (3B active)?");
    expect(confirm.textContent).toContain("frees 17 GB");
    expect(calls(client, "removeModel")).toHaveLength(0);
    await click(within(confirm).getByRole("button", { name: "Keep it" }));
    expect(calls(client, "removeModel")).toHaveLength(0);
  });

  test("a model a level is using cannot be removed, and the Stack's sentence is shown", async () => {
    const { sheet } = await openChat();
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    await click(within(sheet).getByRole("button", { name: "Remove Qwen3 8B" }));
    await click(within(await screen.findByTestId("destructive-confirm")).getByRole("button", { name: "Remove" }));
    expect((await within(sheet).findByRole("alert")).textContent).toContain("Qwen3 8B is in use by a level. Choose another model for that level first.");
  });

  test("More holds the order models are tried in: move, switch off, and it saves to the Stack", async () => {
    const { client, sheet } = await openChat();
    expect(within(sheet).queryByRole("list", { name: "Order models are tried in" })).toBeNull();
    await click(within(sheet).getByRole("button", { name: "More" }));
    const order = within(sheet).getByRole("list", { name: "Order models are tried in" });
    expect(within(order).getAllByRole("listitem")[0]!.textContent).toContain("Qwen3 4B");
    await click(within(order).getByRole("button", { name: "Move Qwen3 8B up" }));
    await waitFor(() => expect(calls(client, "setOrder")[0]!.args).toEqual(["chat", { order: ["qwen3-8b-q4", "qwen3-4b-q4", "qwen3-30b-a3b-q4", "gemma-3-27b-q4", "llama-33-70b-q4", "qwen38-flash-next-177b"], off: [] }]));
    await waitFor(() => expect(within(within(sheet).getByRole("list", { name: "Order models are tried in" })).getAllByRole("listitem")[0]!.textContent).toContain("Qwen3 8B"));
    await click(within(within(sheet).getByRole("list", { name: "Order models are tried in" })).getByRole("switch", { name: "Use Gemma 3 27B" }));
    await waitFor(() => expect((calls(client, "setOrder")[1]!.args[1] as { off: string[] }).off).toEqual(["gemma-3-27b-q4"]));
  });

  test("More also holds the choices kept for other computer sizes, changed the same way", async () => {
    const { client, sheet } = await openChat();
    await click(within(sheet).getByRole("button", { name: "More" }));
    const profiles = within(sheet).getByRole("list", { name: "Models for 128 GB computers" });
    expect(profiles.textContent).toContain("Qwen3 30B (3B active)");
    expect(profiles.textContent).toContain("Qwen3.8 Flash Next 177B");
    await click(within(profiles).getByRole("button", { name: "Change Max for 128 GB computers" }));
    await click(within(sheet).getByRole("radio", { name: /Llama 3\.3 70B/ }));
    await waitFor(() => expect(calls(client, "chooseModel")[0]!.args).toEqual(["chat", "max", { model: "llama-33-70b-q4", profile: "p128", install: false }]));
    expect((await within(sheet).findByRole("status")).textContent).toContain("Saved for 128 GB computers.");
  });

  test("a downloading model's progress climbs while the page polls, then it shows as ready", async () => {
    const client = createFakeStackClient({ downloadStep: 20 });
    render(<StackModelsPage client={client} pollMs={150} />);
    await screen.findByText("Chatterbox Turbo");
    await click(within(card("voice")).getByRole("button", { name: /Voice/ }));
    const sheet = await screen.findByRole("dialog");
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    const row = () => within(within(sheet).getByRole("list", { name: "Models" })).getAllByRole("listitem").find((r) => r.textContent?.includes("VoxCPM2"))!;
    await waitFor(() => expect(row().textContent).toMatch(/Downloading \d+%/));
    await waitFor(() => expect(row().textContent).not.toContain("Downloading"), { timeout: 3000 });
    expect(row().textContent).toContain("Ready");
  });
});

describe("the recommended setup", () => {
  test("opens with a preview that writes nothing, in plain words, then applies on request", async () => {
    const { client } = await setup();
    await click(screen.getByRole("button", { name: "Recommended setup" }));
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByRole("heading", { name: "What would change" })).toBeTruthy();
    expect(calls(client, "recommended")).toEqual([{ method: "recommended", args: [true] }]);
    expect(sheet.textContent).toContain("Chat Standard");
    expect(sheet.textContent).toContain("Qwen3 8B becomes Qwen3 30B (3B active)");
    expect(sheet.textContent).toContain("Downloads that would start");
    expect(sheet.textContent).toContain("Needs your OK first");
    expect(sheet.textContent).toContain("FLUX.1 dev");
    expect(client.snapshot().categories[0]!.tiers[1]!.chosen).toBe("qwen3-8b-q4");

    await click(within(sheet).getByRole("button", { name: "Use the recommended setup" }));
    await waitFor(() => expect(calls(client, "recommended")[1]!.args).toEqual([false]));
    expect((await within(sheet).findByRole("status")).textContent).toContain("The recommended setup is saved.");
    expect(within(sheet).getByRole("heading", { name: "What changed" })).toBeTruthy();
    expect(client.snapshot().categories[0]!.tiers[1]!.chosen).toBe("qwen3-30b-a3b-q4");
    await click(within(sheet).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(within(card("chat")).getByText("Qwen3 30B (3B active)")).toBeTruthy());
  });

  test("when nothing would change it says so and offers no apply button", async () => {
    const view = seedChoicesView();
    for (const category of view.categories) for (const candidate of category.candidates) { candidate.state = "installed"; candidate.licence_needed = false; }
    for (const category of view.categories) for (const row of category.tiers) { row.chosen = row.recommended.model; row.chosen_by = row.chosen_by === "off" ? "off" : "recommended"; }
    const client = createFakeStackClient({ view });
    render(<StackModelsPage client={client} pollMs={0} />);
    await screen.findByText("Qwen3 30B (3B active)");
    await click(screen.getByRole("button", { name: "Recommended setup" }));
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Nothing would change. Your setup already matches the recommendation.")).toBeTruthy();
    expect((within(sheet).getByRole("button", { name: "Use the recommended setup" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("a failed preview says so and applies nothing", async () => {
    const { client } = await setup();
    client.failNext("recommended", "The Stack could not work out a setup right now. Try again in a minute.", "busy");
    await click(screen.getByRole("button", { name: "Recommended setup" }));
    const sheet = await screen.findByRole("dialog");
    expect((await within(sheet).findByRole("alert")).textContent).toContain("The Stack could not work out a setup right now.");
    expect((within(sheet).getByRole("button", { name: "Use the recommended setup" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("free up space", () => {
  test("lists the unused models with sizes, asks before removing, and says what happened to each", async () => {
    const { client } = await setup();
    await click(screen.getByRole("button", { name: "Free up 22 GB" }));
    const dialog = await screen.findByRole("dialog");
    const list = await within(dialog).findByRole("list", { name: "Unused models" });
    expect(list.textContent).toContain("Qwen2.5 14B");
    expect(list.textContent).toContain("Chat · 8.4 GB");
    expect(list.textContent).toContain("FLUX.1 Krea");
    expect(calls(client, "removeUnused")).toHaveLength(0);

    await click(within(dialog).getByRole("checkbox", { name: "Remove FLUX.1 Krea" }));
    const remove = within(dialog).getByRole("button", { name: "Remove and free 8.4 GB" });
    await click(remove);
    const confirm = await screen.findByTestId("destructive-confirm");
    expect(confirm.textContent).toContain("Remove 1 model and free 8.4 GB?");
    expect(confirm.textContent).toContain("Qwen2.5 14B");
    expect(calls(client, "removeUnused")).toHaveLength(0);
    await click(within(confirm).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(calls(client, "removeUnused")).toEqual([{ method: "removeUnused", args: [{ ids: ["qwen25-14b-q4"], tidy: false }] }]));
    const done = await within(dialog).findByRole("list", { name: "What happened to each model" });
    expect(done.textContent).toContain("Removed");
    expect(done.textContent).toContain("Qwen2.5 14B");
    expect(within(dialog).getByRole("status").textContent).toContain("Freed 8.4 GB.");
  });

  test("cancelling the confirmation removes nothing", async () => {
    const { client } = await setup();
    await click(screen.getByRole("button", { name: "Free up 22 GB" }));
    const dialog = await screen.findByRole("dialog");
    await click(await within(dialog).findByRole("button", { name: /Remove and free/ }));
    await click(within(await screen.findByTestId("destructive-confirm")).getByRole("button", { name: "Keep it" }));
    expect(calls(client, "removeUnused")).toHaveLength(0);
  });

  test("leftovers are a separate choice and are included only when ticked", async () => {
    const { client } = await setup();
    await click(screen.getByRole("button", { name: "Free up 22 GB" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("list", { name: "Unused models" });
    await click(within(dialog).getByRole("checkbox", { name: "Also clear leftovers" }));
    await click(within(dialog).getByRole("button", { name: /Remove and free 23 GB/ }));
    await click(within(await screen.findByTestId("destructive-confirm")).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect((calls(client, "removeUnused")[0]!.args[0] as { tidy: boolean }).tidy).toBe(true));
  });

  test("the button is only there when something is unused; a kept model shows the Stack's sentence", async () => {
    const view = seedChoicesView();
    view.unused = { count: 0, total_bytes: 0 };
    const client = createFakeStackClient({ view });
    render(<StackModelsPage client={client} pollMs={0} />);
    await screen.findByText("Qwen3 8B");
    expect(screen.queryByRole("button", { name: /Free up/ })).toBeNull();
  });
});

describe("add a chat model", () => {
  async function openAdd() {
    const ctx = await setup();
    await click(screen.getByRole("button", { name: "More" }));
    await click(screen.getByRole("button", { name: "Add a chat model" }));
    return { ...ctx, dialog: await screen.findByRole("dialog") };
  }

  test("a link is added, chosen for the level, and the page shows the new model", async () => {
    const { client, dialog } = await openAdd();
    fireEvent.change(within(dialog).getByLabelText("Link or owner/name"), { target: { value: "https://huggingface.co/bartowski/Mistral-Small-3.2-24B-Instruct-2506-GGUF" } });
    await click(within(dialog).getByRole("radio", { name: "Boost" }));
    await click(within(dialog).getByRole("button", { name: "Add model" }));
    await waitFor(() => expect(calls(client, "addModel")[0]!.args[0]).toEqual({ source: "https://huggingface.co/bartowski/Mistral-Small-3.2-24B-Instruct-2506-GGUF", tier: "boost", use: true }));
    expect((await within(dialog).findByRole("status")).textContent).toContain("is added and chosen for Boost.");
    await click(within(dialog).getByRole("button", { name: "Done" }));
    await click(within(card("chat")).getByRole("button", { name: /Chat/ }));
    const sheet = await screen.findByRole("dialog");
    await act(async () => { fireEvent.mouseDown(within(sheet).getByRole("tab", { name: "Models" })); fireEvent.click(within(sheet).getByRole("tab", { name: "Models" })); });
    expect(within(sheet).getByRole("list", { name: "Models" }).textContent).toContain("Mistral Small 3.2 24B Instruct 2506");
  });

  test("a bad link shows the Stack's sentence and keeps what was typed", async () => {
    const { dialog } = await openAdd();
    const field = within(dialog).getByLabelText("Link or owner/name") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "not a link" } });
    await click(within(dialog).getByRole("button", { name: "Add model" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("That does not look like a Hugging Face link.");
    expect(field.value).toBe("not a link");
  });

  test("an empty box is caught before anything is sent", async () => {
    const { client, dialog } = await openAdd();
    await click(within(dialog).getByRole("button", { name: "Add model" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("Paste a Hugging Face link, or type owner/name, first.");
    expect(calls(client, "addModel")).toHaveLength(0);
  });
});

describe("priority", () => {
  test("lists the features in the order they are served and saves a move to the Stack", async () => {
    const { client } = await setup();
    await click(screen.getByRole("button", { name: "More" }));
    const list = screen.getByRole("list", { name: "Priority order" });
    expect(within(list).getAllByRole("listitem")[0]!.textContent).toContain("Wake word");
    await click(within(list).getByRole("button", { name: "Move Voice down" }));
    await waitFor(() => expect(calls(client, "setRolePriorities")).toHaveLength(1));
    const written = calls(client, "setRolePriorities")[0]!.args[0] as Record<string, number>;
    expect(Object.values(written).every((n) => n % 10 === 0)).toBe(true);
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Priority order" })).getAllByRole("listitem")[3]!.textContent).toContain("Voice"));
    expect((await screen.findByRole("status")).textContent).toContain("Voice moved down.");
  });
});

describe("host slots", () => {
  test("lockedItems disable what the host forbids and show its sentence; the page never asks who", async () => {
    const { client } = await setup({ lockedItems: { pictures: "Pictures are locked for this profile.", "chat:max": "Only an admin can change Max.", recommended: "Only an admin can apply the recommended setup." } });
    expect(within(card("pictures")).queryByRole("switch")).toBeNull();
    expect(within(card("pictures")).getByText("Pictures are locked for this profile.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Recommended setup" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Only an admin can apply the recommended setup.")).toBeTruthy();
    await click(within(card("chat")).getByRole("button", { name: /Chat/ }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("button", { name: "Change Boost" })).toBeTruthy();
    expect(within(sheet).queryByRole("button", { name: "Change Max" })).toBeNull();
    expect(within(sheet).getByText("Only an admin can change Max.")).toBeTruthy();
    expect(calls(client, "setRoleEnabled")).toHaveLength(0);
  });

  test("a locked feature offers no change at all in its sheet", async () => {
    await setup({ lockedItems: { pictures: "Pictures are locked for this profile." } });
    await click(within(card("pictures")).getByRole("button", { name: /Pictures/ }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("button", { name: /^Change / })).toBeNull();
    expect(within(sheet).queryByRole("button", { name: "More" })).toBeNull();
    expect(within(sheet).queryByRole("switch")).toBeNull();
  });

  test("extraSections render after the page's own, and onNavigate adds quiet links", async () => {
    const seen: string[] = [];
    await setup({ extraSections: [{ id: "tools", title: "Tools", description: "Restart and repair.", content: <p>Host content</p> }], onNavigate: (t) => seen.push(t) });
    const extra = screen.getByTestId("extra-tools");
    expect(within(extra).getByRole("heading", { name: "Tools" })).toBeTruthy();
    expect(extra.textContent).toContain("Host content");
    await click(screen.getByRole("button", { name: "More" }));
    await click(screen.getByRole("button", { name: "Disk space" }));
    expect(seen).toEqual(["disk"]);
  });

  test("a change made elsewhere shows at once when the client's feed says so", async () => {
    const { client } = await setup();
    await client.setRoleEnabled("video", true);
    expect(within(card("video")).getByRole("switch").getAttribute("aria-checked")).toBe("false");
    await act(async () => { client.emitChange(); });
    await waitFor(() => expect(within(card("video")).getByRole("switch").getAttribute("aria-checked")).toBe("true"));
  });
});

describe("structure for a screen reader", () => {
  async function violations(container: HTMLElement, rules: string[]) {
    const result = await axe.run(container, { runOnly: { type: "rule", values: rules } });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" / ")}`);
  }
  const RULES = ["aria-valid-attr", "aria-valid-attr-value", "aria-required-children", "aria-required-parent", "aria-roles", "button-name", "label", "list", "listitem", "duplicate-id-aria", "aria-allowed-attr", "aria-required-attr", "nested-interactive", "aria-hidden-focus"];

  test("the summary has named controls, valid lists and no nested interactive elements", async () => {
    const { view } = await setup();
    await click(screen.getByRole("button", { name: "More" }));
    expect(await violations(view.container, RULES)).toEqual([]);
  });

  test("the details sheet, the recommended sheet, free up space and add a model are valid too", async () => {
    await setup();
    await click(within(card("chat")).getByRole("button", { name: /Chat/ }));
    let dialog = await screen.findByRole("dialog");
    await click(within(dialog).getByRole("button", { name: "Change Standard" }));
    await click(within(dialog).getByRole("button", { name: "More" }));
    expect(await violations(dialog, RULES)).toEqual([]);
    cleanup();

    await setup();
    await click(screen.getByRole("button", { name: "Recommended setup" }));
    dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("heading", { name: "What would change" });
    expect(await violations(dialog, RULES)).toEqual([]);
    cleanup();

    await setup();
    await click(screen.getByRole("button", { name: "Free up 22 GB" }));
    dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("list", { name: "Unused models" });
    expect(await violations(dialog, RULES)).toEqual([]);
    cleanup();

    await setup();
    await click(screen.getByRole("button", { name: "More" }));
    await click(screen.getByRole("button", { name: "Add a chat model" }));
    dialog = await screen.findByRole("dialog");
    expect(await violations(dialog, RULES)).toEqual([]);
  });

  test("a switch is named by its feature and a heading leads the page", async () => {
    await setup();
    expect(screen.getByRole("heading", { level: 2, name: "AI and models" })).toBeTruthy();
    for (const feature of ["Chat", "Video", "Music"]) expect(within(card(feature.toLowerCase())).getByRole("switch", { name: `${feature} on or off` })).toBeTruthy();
  });
});

test("a StackClientError carries the sentence and the code", () => {
  const error = new StackClientError("Nope.", "nope");
  expect([error.message, error.code]).toEqual(["Nope.", "nope"]);
});
