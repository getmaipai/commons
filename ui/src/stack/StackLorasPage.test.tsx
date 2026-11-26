import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { StackLorasPage } from "./StackLorasPage";
import { createFakeStackClient } from "./fakeStackClient";
import type { FakeStackClient } from "./fakeStackClient";

afterEach(cleanup);
const screen = within(document.body);
const click = (element: HTMLElement) => act(async () => { fireEvent.click(element); });
const calls = (client: FakeStackClient, method: string) => client.calls.filter((call) => call.method === method);
const type = (element: HTMLElement, value: string) => act(async () => { fireEvent.change(element, { target: { value } }); });

async function ready(props: { client?: FakeStackClient; pollMs?: number; redacted?: boolean; locked?: string | null; askTicket?: () => Promise<string | null> } = {}) {
  const client = props.client ?? createFakeStackClient();
  render(<StackLorasPage client={client} pollMs={props.pollMs ?? 0} redacted={props.redacted} locked={props.locked} askTicket={props.askTicket} />);
  await screen.findByText("Soft watercolor");
  return client;
}
async function pickDrive(label: string, name: string) {
  await click(screen.getByRole("combobox", { name: "Drive" }));
  await click(await screen.findByRole("option", { name }));
  void label;
}

describe("Styles page", () => {
  test("a host without a loras client gets one plain sentence", async () => {
    const client = createFakeStackClient(); (client as { loras?: unknown }).loras = undefined;
    render(<StackLorasPage client={client} pollMs={0} />);
    expect(await screen.findByText(/does not manage styles yet/)).toBeTruthy();
  });

  test("lists the library with media, audience, size, drive and trigger words, and keeps the trash apart", async () => {
    await ready();
    expect(screen.getByText("Clay animation")).toBeTruthy();
    expect(screen.getByText("Night market")).toBeTruthy();
    expect(screen.getAllByText("Adults only").length).toBeGreaterThan(0);
    expect(screen.getByText(/Wan 2.1 · 310 MB · This computer/)).toBeTruthy();
    expect(screen.getByText("Trigger words: watercolor style")).toBeTruthy();
    expect(screen.queryByText("Retro poster")).toBeNull();
    expect(screen.getByText("Trash (1)")).toBeTruthy();
  });

  test("a style on a drive that is not connected says how to fix it and cannot be moved", async () => {
    await ready();
    expect(screen.getByText("Drive not connected. Plug in Offline drive, then this style works again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Ink sketch to another drive" }).hasAttribute("disabled")).toBe(true);
  });

  test("redacted data shows one locked tile and no audience words", async () => {
    const client = createFakeStackClient();
    const real = client.loras.list;
    client.loras.list = async (options) => { const out = await real(options); return { ...out, loras: out.loras.filter((l) => !("classification" in l) || l.classification !== "adult-only").concat(options?.removed ? [] : [{ locked: true as const }]) }; };
    await ready({ client, redacted: true });
    expect(screen.getByText("Some styles are locked. Open the adult lock to see them.")).toBeTruthy();
    expect(screen.queryByText("Night market")).toBeNull();
    expect(screen.queryByText("Adults only")).toBeNull();
    await click(screen.getByRole("button", { name: "Edit Soft watercolor" }));
    expect(screen.queryByLabelText("Adults only")).toBeNull();
  });

  test("a gate sentence disables every control and is shown", async () => {
    await ready({ locked: "Styles are managed in Home." });
    expect(screen.getByText("Styles are managed in Home.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Soft watercolor" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Remove Soft watercolor" }).hasAttribute("disabled")).toBe(true);
  });

  test("edit saves name, trigger words and strength", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Edit Soft watercolor" }));
    await type(await screen.findByLabelText("Name"), "Watercolor wash");
    await type(screen.getByLabelText("Trigger words, separated by commas"), "wash, soft");
    await type(screen.getByLabelText("Strength (0 to 2)"), "0.6");
    await click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Watercolor wash");
    const patch = calls(client, "loras.patch")[0]!;
    expect(patch.args[1]).toEqual({ name: "Watercolor wash", strength_default: 0.6, trigger_words: ["wash", "soft"] });
  });

  test("marking adults only needs no ticket, and lowering is not offered without a way to ask", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Edit Soft watercolor" }));
    await click(await screen.findByRole("switch", { name: "Adults only" }));
    await click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(client.loras.snapshot().find((l) => l.id === "watercolor")?.classification).toBe("adult-only"));
    expect((calls(client, "loras.patch")[0]!.args[1] as { ticket?: string }).ticket).toBeUndefined();
    await click(screen.getByRole("button", { name: "Edit Night market" }));
    expect(await screen.findByText(/Only Home can mark an adults only style as all ages/)).toBeTruthy();
  });

  test("lowering with a host ticket sends the ticket", async () => {
    const client = await ready({ askTicket: async () => "ticket-1" });
    await click(screen.getByRole("button", { name: "Edit Night market" }));
    await click(await screen.findByRole("switch", { name: "Adults only" }));
    await click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(client.loras.snapshot().find((l) => l.id === "night")?.classification).toBe("all-ages"));
    expect((calls(client, "loras.patch")[0]!.args[1] as { ticket?: string }).ticket).toBe("ticket-1");
  });

  test("a refused edit shows the Stack's sentence and keeps the dialog open", async () => {
    const client = await ready();
    client.failNext("loras.patch", "That name is already used. Pick another.", "name_taken");
    await click(screen.getByRole("button", { name: "Edit Soft watercolor" }));
    await click(await screen.findByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("That name is already used. Pick another.");
  });

  test("remove goes to the trash, restore brings it back, delete for good asks first", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "Remove Clay animation" }));
    await screen.findByText(/Clay animation is in the trash\. You can bring it back for 30 days\./);
    await waitFor(() => expect(screen.getByText("Trash (2)")).toBeTruthy());
    await click(screen.getByRole("button", { name: "Trash (2)" }));
    await click(await screen.findByRole("button", { name: "Restore Retro poster" }));
    await waitFor(() => expect(screen.getAllByText("Retro poster").length).toBe(1));
    expect(client.loras.snapshot().find((l) => l.id === "old")?.removed_at).toBeNull();
    await click(screen.getByRole("button", { name: "Delete Clay animation for good" }));
    await screen.findByText(/cannot be brought back/);
    expect(client.loras.snapshot().some((l) => l.id === "clay")).toBe(true);
    await click(screen.getByRole("button", { name: "Delete for good", hidden: false }));
    await waitFor(() => expect(client.loras.snapshot().some((l) => l.id === "clay")).toBe(false));
    expect(calls(client, "loras.remove").at(-1)!.args).toEqual(["clay", true]);
  });

  test("move offers only other connected drives, shows progress, then the new drive", async () => {
    const client = await ready({ pollMs: 20 });
    await click(screen.getByRole("button", { name: "Move Soft watercolor to another drive" }));
    await click(await screen.findByRole("combobox", { name: "Drive" }));
    expect(screen.queryByRole("option", { name: "This computer" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Offline drive" })).toBeNull();
    await click(await screen.findByRole("option", { name: "Backup drive" }));
    await click(screen.getByRole("button", { name: "Move", hidden: false }));
    await screen.findByText(/Moving Soft watercolor/);
    await waitFor(() => expect(client.loras.snapshot().find((l) => l.id === "watercolor")?.disk_id).toBe("backup"), { timeout: 2000 });
    await screen.findByText("Moved Soft watercolor.");
    await waitFor(() => expect(screen.getByText(/SDXL 1.0 · 144 MB · Backup drive/)).toBeTruthy());
  });

  test("a move refusal is shown as the Stack says it", async () => {
    const client = await ready();
    client.failNext("loras.move", "Backup drive is not connected. Plug it back in or choose another drive.", "drive_missing");
    await click(screen.getByRole("button", { name: "Move Soft watercolor to another drive" }));
    await click(await screen.findByRole("combobox", { name: "Drive" }));
    await click(await screen.findByRole("option", { name: "Backup drive" }));
    await click(screen.getByRole("button", { name: "Move", hidden: false }));
    expect((await screen.findByRole("alert")).textContent).toContain("Plug it back in");
  });
});

describe("Add a style", () => {
  test("searching lists hits with base model, size and downloads, and flags adult looks", async () => {
    const client = await ready();
    await type(screen.getByLabelText("Style name or look"), "paper");
    await click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Paper cut");
    expect(screen.getByText(/SDXL 1.0 · 170 MB · 12,400 downloads/)).toBeTruthy();
    expect(calls(client, "loras.search")[0]!.args).toEqual(["huggingface", "paper"]);
  });

  test("the global-licence refusal is shown plainly and one button accepts it, then the install starts", async () => {
    const client = await ready({ pollMs: 20 });
    await type(screen.getByLabelText("Style name or look"), "paper");
    await click(screen.getByRole("button", { name: "Search" }));
    await click(await screen.findByRole("button", { name: "Add Paper cut" }));
    await pickDrive("Keep it on", "Backup drive");
    await click(screen.getByRole("button", { name: "Add style" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Accept the licences in the Stack admin first");
    await click(screen.getByRole("button", { name: "Accept the licences" }));
    expect(client.licences.snapshot().accepted).toBe(true);
    await click(screen.getByRole("button", { name: "Add style" }));
    await screen.findByText(/Adding Paper cut/);
    const body = calls(client, "loras.install").at(-1)!.args[0] as { disk_id: string | null; media: string; audience: string; source: string };
    expect(body).toMatchObject({ disk_id: "backup", media: "picture", audience: "all-ages", source: "huggingface" });
    await screen.findByText("Added Paper cut.", undefined, { timeout: 2000 });
    expect(client.loras.snapshot().some((l) => l.name === "Paper cut" && l.disk_id === "backup")).toBe(true);
  });

  test("a video-looking hit defaults to video and an adult-looking hit says it is added as adults only", async () => {
    await ready();
    await type(screen.getByLabelText("Style name or look"), "neon");
    await click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Looks like adults only");
    await click(screen.getByRole("button", { name: "Add Neon night" }));
    expect(await screen.findByText(/added as adults only/)).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Used for" }).textContent).toBe("Video");
  });

  test("a site key is saved without ever being shown, and can be removed", async () => {
    const client = await ready();
    expect(screen.getByText(/No Hugging Face key is saved/)).toBeTruthy();
    await click(screen.getByRole("button", { name: "Add a key" }));
    const input = await screen.findByLabelText("Key");
    expect(input.getAttribute("type")).toBe("password");
    await type(input, "hf_secret");
    await click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("A Hugging Face key is saved.");
    expect(client.loras.hasKey("huggingface")).toBe(true);
    expect(document.body.textContent).not.toContain("hf_secret");
    await click(screen.getByRole("button", { name: "Change key" }));
    await click(await screen.findByRole("button", { name: "Remove key" }));
    await screen.findByText(/No Hugging Face key is saved/);
    expect(client.loras.hasKey("huggingface")).toBe(false);
  });

  test("a failed search says so in words", async () => {
    const client = await ready();
    client.failNext("loras.search", "Hugging Face did not answer. Try again in a minute.", "source_down");
    await type(screen.getByLabelText("Style name or look"), "paper");
    await click(screen.getByRole("button", { name: "Search" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Hugging Face did not answer. Try again in a minute.");
  });
});
