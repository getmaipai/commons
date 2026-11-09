import { toast } from "sonner";
import { i18n } from "@/kit/i18n";

/** The full hub address for a route inside the hub (`/apps/music/album?id=1`). Same origin only; nothing is sent anywhere. */
export function hubLink(to: string, origin = typeof window !== "undefined" ? window.location.origin : "http://localhost"): string {
  const path = to.startsWith("/") ? to : `/${to}`;
  try {
    return new URL(path, origin).toString();
  } catch {
    // An opaque origin (a sandboxed frame) cannot be a base; the route alone is still a usable link.
    return path;
  }
}

/** PARITY-01 `share` action: hand a link to this hub to the device share sheet, or copy it. Throws a plain message when neither works. */
export async function shareHubLink(to: string, title?: string): Promise<void> {
  const url = hubLink(to);
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ url, title: title || undefined });
      return;
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
    try {
      await nav.clipboard.writeText(url);
      toast(i18n._({ id: "ui.Link copied", message: "Link copied" }));
      return;
    } catch {
      // Falls through to the plain message below.
    }
  }
  throw new Error(i18n._({ id: "ui.Could not share this link. Copy the address from the browser bar instead.", message: "Could not share this link. Copy the address from the browser bar instead." }));
}
