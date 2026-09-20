import { describe, expect, test, afterEach, mock } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Command, CommandList } from "@/kit/ui/command";
import { SearchResultGroups } from "./SearchResultGroups";
import type { SearchGroup } from "./types";

afterEach(cleanup);

function renderGroups(props: Partial<Parameters<typeof SearchResultGroups>[0]> & { groups: SearchGroup[]; trimmedQuery: string }) {
  const onSelect = mock(() => {});
  const result = render(
    <Command shouldFilter={false}>
      <CommandList>
        <SearchResultGroups onSelect={onSelect} {...props} />
      </CommandList>
    </Command>,
  );
  return { ...result, onSelect };
}

describe("SearchResultGroups", () => {
  test("shows the empty-query hint when there are no groups and no query, and onAsk exists", () => {
    const { getByText } = renderGroups({ groups: [], trimmedQuery: "", onAsk: () => {} });
    expect(getByText(/Type to search, or press Enter to ask\./)).toBeInTheDocument();
  });

  test("without onAsk, the empty-query hint never mentions asking", () => {
    const { getByText, queryByText } = renderGroups({ groups: [], trimmedQuery: "" });
    expect(getByText("Type to search.")).toBeInTheDocument();
    expect(queryByText(/ask/i)).not.toBeInTheDocument();
  });

  test("a real query matching nothing, with no onAsk, still shows feedback rather than a blank list", () => {
    const { getByText } = renderGroups({ groups: [], trimmedQuery: "xyz-no-match" });
    expect(getByText("No results.")).toBeInTheDocument();
  });

  test("a real query matching nothing, WITH onAsk, shows the Ask row instead of a separate no-results message", () => {
    const { getByText, queryByText } = renderGroups({ groups: [], trimmedQuery: "xyz-no-match", onAsk: () => {} });
    expect(getByText("Ask: xyz-no-match")).toBeInTheDocument();
    expect(queryByText("No results.")).not.toBeInTheDocument();
  });

  test("the Ask row needs both a real query and onAsk to render", () => {
    const withoutAsk = renderGroups({ groups: [], trimmedQuery: "kitchen" });
    expect(withoutAsk.queryByText(/Ask: kitchen/)).not.toBeInTheDocument();

    const withAskNoQuery = renderGroups({ groups: [], trimmedQuery: "", onAsk: () => {} });
    expect(withAskNoQuery.queryByText(/^Ask:/)).not.toBeInTheDocument();

    const withBoth = renderGroups({ groups: [], trimmedQuery: "kitchen", onAsk: () => {} });
    expect(withBoth.getByText("Ask: kitchen")).toBeInTheDocument();
  });

  test("clicking the Ask row calls onAsk with the current query", () => {
    const onAsk = mock(() => {});
    const { getByText } = renderGroups({ groups: [], trimmedQuery: "kitchen", onAsk });
    fireEvent.click(getByText("Ask: kitchen"));
    expect(onAsk).toHaveBeenCalledTimes(1);
  });

  test("a custom askLabel replaces the default 'Ask' wording", () => {
    const { getByText } = renderGroups({ groups: [], trimmedQuery: "kitchen", onAsk: () => {}, askLabel: "Ask MaiPai" });
    expect(getByText("Ask MaiPai: kitchen")).toBeInTheDocument();
  });

  test("clicking a result item calls onSelect with that exact item", () => {
    const group: SearchGroup = { heading: "Apps", items: [{ id: "app:chat", label: "Chat", icon: "message-circle", to: "/chat" }] };
    const { getByText, onSelect } = renderGroups({ groups: [group], trimmedQuery: "" });
    fireEvent.click(getByText("Chat"));
    expect(onSelect).toHaveBeenCalledWith(group.items[0]);
  });

  test("renders a sublabel only when the item has one", () => {
    const group: SearchGroup = {
      heading: "People",
      items: [{ id: "p1", label: "Alfred", sublabel: "Adult", icon: "users", to: "/people/1" }],
    };
    const { getByText } = renderGroups({ groups: [group], trimmedQuery: "" });
    expect(getByText("Adult")).toBeInTheDocument();
  });
});
