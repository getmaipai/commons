// STATUS-TOAST-01: toasts take the StatusCard's kind colors.
import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { Toaster } from "./sonner";

describe("Toaster kinds", () => {
  test("an error toast carries the problem tint class and a success toast the done tint", async () => {
    const view = render(<Toaster />);
    toast.error("Could not save. Try again.");
    toast.success("Saved.");
    await waitFor(() => expect(view.container.ownerDocument.querySelectorAll("[data-sonner-toast]").length).toBeGreaterThanOrEqual(2));
    const classes = [...view.container.ownerDocument.querySelectorAll("[data-sonner-toast]")].map((n) => n.className).join(" ");
    expect(classes).toContain("--tint-problem-border");
    expect(classes).toContain("--status-done-ink");
  });
});
