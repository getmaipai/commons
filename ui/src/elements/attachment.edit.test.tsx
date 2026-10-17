import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import {
  ImageEditContext,
  UserMessageAttachments,
  type ImageEditContextValue,
} from "./attachment.aui";

afterEach(cleanup);

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function Harness({ edit }: { edit: ImageEditContextValue | null }) {
  const runtime = useLocalRuntime(adapter, {
    initialMessages: [
      {
        role: "user",
        content: [{ type: "text", text: "look" }],
        attachments: [
          {
            id: "att-1",
            type: "image",
            name: "cat.png",
            contentType: "image/png",
            status: { type: "complete" },
            content: [{ type: "image", image: PIXEL }],
          },
        ],
      },
    ],
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ImageEditContext.Provider value={edit}>
        <ThreadPrimitive.Messages>{() => <UserMessageAttachments />}</ThreadPrimitive.Messages>
      </ImageEditContext.Provider>
    </AssistantRuntimeProvider>
  );
}

describe("message picture Edit action", () => {
  test("no provider: no Edit button", () => {
    const { container } = render(<Harness edit={null} />);
    expect(container.querySelector('[data-image-edit="true"]')).toBeNull();
  });

  test("provider: Edit button is named, reveal classes set, click calls onEdit once and does not open the preview", () => {
    const calls: unknown[] = [];
    const { container, getByRole, queryByRole } = render(
      <Harness edit={{ onEdit: (a) => calls.push(a) }} />,
    );
    const button = getByRole("button", { name: "Edit picture" });
    expect(button.getAttribute("data-image-edit")).toBe("true");
    expect(button.className).toContain("group-hover/edit-tile:opacity-100");
    expect(button.className).toContain("focus-visible:opacity-100");
    expect(button.className).toContain("[@media(hover:none)]:opacity-100");
    expect(container.querySelector(".aui-attachment-root")!.className).toContain("group/edit-tile");
    fireEvent.click(button);
    expect(calls).toEqual([{ id: "att-1", name: "cat.png", src: PIXEL }]);
    expect(queryByRole("dialog")).toBeNull();
  });

  test("custom label and canEdit=false", () => {
    const { getByRole, rerender, queryByRole } = render(
      <Harness edit={{ onEdit: () => {}, label: "Change it" }} />,
    );
    expect(getByRole("button", { name: "Change it" })).toBeTruthy();
    rerender(<Harness edit={{ onEdit: () => {}, canEdit: () => false }} />);
    expect(queryByRole("button", { name: "Edit picture" })).toBeNull();
  });
});
