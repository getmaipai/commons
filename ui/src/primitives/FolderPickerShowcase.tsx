// Kit showcase entry for FolderPicker.
import { FolderPicker, type FolderPickerCopy, type FolderPickerListing } from "@/kit/primitives/FolderPicker";

const copy: FolderPickerCopy = {
  title: "Choose a folder",
  upLabel: "Up",
  chooseLabel: "Choose this folder",
  newFolderLabel: "New folder",
  newFolderNameLabel: "Folder name",
  createLabel: "Create folder",
  cancelLabel: "Cancel",
  emptyText: "This folder has no folders inside it. Choose it, or make a new one.",
  errorText: "Home could not read that folder. Pick another folder, or try again.",
  retryLabel: "Try again",
  loadingLabel: "Loading folders",
  freeSpaceLabel: (free) => `${free} free on this disk`,
};

const listing: FolderPickerListing = {
  path: "/Volumes/Data/maipai",
  parent: "/Volumes/Data",
  freeBytes: 412_000_000_000,
  rows: [
    { name: "models", path: "/Volumes/Data/maipai/models", writable: true },
    { name: "records", path: "/Volumes/Data/maipai/records", writable: true },
    { name: "system", path: "/Volumes/Data/maipai/system", writable: false, disabledReason: "Home cannot write here. Pick another folder." },
  ],
};

const noop = () => {};
const handlers = { onOpen: noop, onUp: noop, onChoose: noop, onCreate: noop };

export function FolderPickerShowcase() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 p-4">
      <FolderPicker listing={listing} copy={copy} {...handlers} />
      <FolderPicker listing={{ ...listing, rows: [] }} copy={copy} {...handlers} />
      <FolderPicker listing={undefined} copy={copy} {...handlers} />
      <FolderPicker listing={listing} error onRetry={noop} copy={copy} {...handlers} />
    </div>
  );
}
