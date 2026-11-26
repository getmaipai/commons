// STACK-LICENCE-01. The licence card over the fake client: what it offers before the acceptance, what one click sends, what is left afterwards,
// and that a host without the licences routes sees no card at all.
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { StackLicences } from "./StackLicences";
import { StackModelsPage } from "./StackModelsPage";
import { createFakeStackClient } from "./fakeStackClient";
import type { FakeStackClient } from "./fakeStackClient";
import type { StackClient, StackLicencesClient } from "./StackClient";

afterEach(cleanup);

const screen = within(document.body);
const click = (element: HTMLElement) => act(async () => { fireEvent.click(element); });
const calls = (client: FakeStackClient, method: string) => client.calls.filter((call) => call.method === method);

async function ready(client = createFakeStackClient(), pollMs = 0) {
  render(<StackModelsPage client={client} pollMs={pollMs} />);
  await screen.findByRole("heading", { name: "Model licences" });
  return client;
}

describe("Model licences", () => {
  test("before the acceptance it names each licence as a link with its summary points and one primary button", async () => {
    await ready();
    const card = screen.getByTestId("licences-card");
    const qwen = within(card).getByRole("link", { name: "Qwen research licence" });
    expect(qwen.getAttribute("href")).toBe("https://example.com/qwen-licence");
    expect(qwen.getAttribute("target")).toBe("_blank");
    expect(qwen.getAttribute("rel")).toBe("noopener noreferrer");
    within(card).getByRole("link", { name: "Image maker licence" });
    expect(card.textContent).toContain("Free while your business stays small.");
    expect(card.textContent).toContain("Some models come with the maker's licence. Read them once and accept, and every model can then be installed.");
    expect(within(card).getByRole("button", { name: "I have read and accept the licences of the models the Stack installs" })).toBeTruthy();
  });

  test("Accept records the acceptance once, then only the accepted line is left", async () => {
    const client = await ready();
    await click(screen.getByRole("button", { name: "I have read and accept the licences of the models the Stack installs" }));
    await waitFor(() => expect(calls(client, "licences.accept")).toHaveLength(1));
    expect((await screen.findByTestId("licences-accepted")).textContent).toMatch(/Licences accepted on .+\./);
    expect(screen.queryByTestId("licences-card")).toBeNull();
    expect(client.licences.snapshot().accepted).toBe(true);
  });

  test("accepting refreshes the choices, so a model waiting on a licence stops saying so", async () => {
    const client = await ready();
    const before = calls(client, "readChoices").length;
    expect(client.snapshot().categories.some((category) => category.candidates.some((candidate) => candidate.licence_needed))).toBe(true);
    await click(screen.getByRole("button", { name: "I have read and accept the licences of the models the Stack installs" }));
    await screen.findByTestId("licences-accepted");
    await waitFor(() => expect(calls(client, "readChoices").length).toBeGreaterThan(before));
    expect(client.licences.snapshot().accepted).toBe(true);
  });

  test("a refused acceptance shows the Stack's sentence and keeps the button", async () => {
    const client = await ready();
    client.failNext("licences.accept", "The Stack is still writing down what you agreed to. Try again.", "busy");
    await click(screen.getByRole("button", { name: "I have read and accept the licences of the models the Stack installs" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The Stack is still writing down what you agreed to. Try again.");
    expect(screen.getByRole("button", { name: "I have read and accept the licences of the models the Stack installs" })).toBeTruthy();
    expect(client.licences.snapshot().accepted).toBe(false);
  });

  test("an already accepted Stack shows only the quiet line", async () => {
    const client = createFakeStackClient();
    await client.licences!.accept();
    render(<StackLicences client={client.licences!} />);
    expect((await screen.findByTestId("licences-accepted")).textContent).toMatch(/Licences accepted on .+\./);
    expect(screen.queryByRole("heading", { name: "Model licences" })).toBeNull();
    expect(screen.queryByRole("button", { name: /I have read and accept/ })).toBeNull();
  });

  test("the section is absent when a host has no licences client", async () => {
    const client = createFakeStackClient();
    (client as StackClient & { licences?: StackLicencesClient }).licences = undefined;
    render(<StackModelsPage client={client} pollMs={0} />);
    await screen.findByText("Qwen3 8B");
    expect(screen.queryByRole("heading", { name: "Model licences" })).toBeNull();
    expect(screen.queryByRole("button", { name: /I have read and accept/ })).toBeNull();
  });
});
