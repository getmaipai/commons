"use client";

import { ProjectHomeHeader, ProjectHomeTabs } from "./project-home-page";

/** PROJECTS-UI-04 showcase for the shipped project page header and empty tabs. */
export function ProjectHomePageShowcase() {
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <ProjectHomeHeader project={{ name: "Garden", icon: "leaf", color: "green", description: "Plan the backyard", instructions: "", memory_mode: "shared" }} canEdit canManage onSave={() => {}} />
    <ProjectHomeTabs projects={{ folders: [], canMove: false, rowVariant: "page", pageRows: {} }} showSources hasChats={false} />
  </main>;
}
