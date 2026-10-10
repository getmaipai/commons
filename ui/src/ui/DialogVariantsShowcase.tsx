"use client";

// Story for the additive DialogContent size and scroll variants, next to the
// unchanged default. Each dialog is open so the story shows them all.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

export function DialogVariantsShowcase() {
  return (
    <>
      <Dialog open modal={false}>
        <DialogContent size="xl" scroll="viewport">
          <DialogHeader>
            <DialogTitle>Wide, scrolling dialog</DialogTitle>
            <DialogDescription>
              size="xl" widens it; scroll="viewport" caps the height at the screen and scrolls.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
