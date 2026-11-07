"use client";

import { useState, type FC } from "react";
import { ProjectMark } from "./project-mark";
import { ProjectSettingsDialog, type ProjectSettingsValue } from "./project-settings";
import { EmptyState, EmptyStateGreeting } from "./empty-state";
import { ThreadListItems, ThreadListRoot, type ThreadListProjects } from "./thread-list.aui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { i18n } from "@/kit/i18n";

export type ProjectHomeValue = ProjectSettingsValue & { description?: string | null };
export type ProjectHomeLabels = {
  options: string; edit: string; archive: string; delete: string; deleteTitle: string;
  deleteDescription: string; cancel: string; confirmDelete: string; chats: string;
  sources: string; artifacts: string; noChats: string; startChat: string;
  noSources: string; sourcesHelp: string; noArtifacts: string; artifactsHelp: string;
};

const defaultLabels = (): ProjectHomeLabels => ({
  options: i18n._({ id: "ui.Project options", message: "Project options" }),
  edit: i18n._({ id: "ui.Edit project", message: "Edit project" }),
  archive: i18n._({ id: "ui.Archive project", message: "Archive project" }),
  delete: i18n._({ id: "ui.Delete project", message: "Delete project" }),
  deleteTitle: i18n._({ id: "ui.Delete this project?", message: "Delete this project?" }),
  deleteDescription: i18n._({ id: "ui.Its chats stay.", message: "Its chats stay." }),
  cancel: i18n._({ id: "ui.Cancel", message: "Cancel" }),
  confirmDelete: i18n._({ id: "ui.Delete project", message: "Delete project" }),
  chats: i18n._({ id: "ui.Chats", message: "Chats" }),
  sources: i18n._({ id: "ui.Sources", message: "Sources" }),
  artifacts: i18n._({ id: "ui.Artifacts", message: "Artifacts" }),
  noChats: i18n._({ id: "ui.No chats yet", message: "No chats yet" }),
  startChat: i18n._({ id: "ui.Start a chat above. It will be saved in this project.", message: "Start a chat above. It will be saved in this project." }),
  noSources: i18n._({ id: "ui.No sources yet", message: "No sources yet" }),
  sourcesHelp: i18n._({ id: "ui.Project sources will appear here when file support is available.", message: "Project sources will appear here when file support is available." }),
  noArtifacts: i18n._({ id: "ui.No artifacts yet", message: "No artifacts yet" }),
  artifactsHelp: i18n._({ id: "ui.Artifacts created in this project will appear here.", message: "Artifacts created in this project will appear here." }),
});

export const ProjectHomeHeader: FC<{
  project: ProjectHomeValue;
  canEdit: boolean;
  canManage: boolean;
  onSave: (patch: Partial<ProjectSettingsValue>) => void | Promise<void>;
  onArchive?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  labels?: Partial<ProjectHomeLabels>;
}> = ({ project, canEdit, canManage, onSave, onArchive, onDelete, labels }) => {
  const text = { ...defaultLabels(), ...labels };
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <>
      <div data-slot="project-home-header" className="flex w-full items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-center gap-3"><ProjectMark icon={project.icon} color={project.color} size="lg" /><div className="min-w-0"><h2 className="truncate text-2xl font-semibold">{project.name}</h2>{project.description ? <p className="text-muted-foreground text-sm">{project.description}</p> : null}</div></div>
        {canEdit ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={text.options}><span aria-hidden>•••</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditing(true)}>{text.edit}</DropdownMenuItem>{canManage ? <DropdownMenuItem onSelect={() => void onArchive?.()}>{text.archive}</DropdownMenuItem> : null}{canManage ? <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>{text.delete}</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu> : null}
      </div>
      <ProjectSettingsDialog open={editing} onOpenChange={setEditing} value={project} memoryModes={[]} onSave={onSave} labels={{ instructionsHelp: i18n._({ id: "ui.These instructions shape answers in this project.", message: "These instructions shape answers in this project." }) }} />
      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{text.deleteTitle}</AlertDialogTitle><AlertDialogDescription>{text.deleteDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{text.cancel}</AlertDialogCancel><AlertDialogAction onClick={() => void onDelete?.()}>{text.confirmDelete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};

export const ProjectHomeTabs: FC<{
  projects: ThreadListProjects;
  showSources: boolean;
  chatsLoading?: boolean;
  hasChats: boolean;
  labels?: Partial<ProjectHomeLabels>;
}> = ({ projects, showSources, chatsLoading = false, hasChats, labels }) => {
  const text = { ...defaultLabels(), ...labels };
  return (
    <div data-slot="project-home-tabs" className="w-full pt-2"><Tabs defaultValue="chats"><TabsList variant="line"><TabsTrigger value="chats">{text.chats}</TabsTrigger>{showSources ? <TabsTrigger value="sources">{text.sources}</TabsTrigger> : null}<TabsTrigger value="artifacts">{text.artifacts}</TabsTrigger></TabsList><TabsContent value="chats">{!chatsLoading && !hasChats ? <EmptyState><EmptyStateGreeting>{text.noChats}</EmptyStateGreeting><p className="text-muted-foreground text-center">{text.startChat}</p></EmptyState> : <ThreadListRoot><ThreadListItems projects={projects} /></ThreadListRoot>}</TabsContent>{showSources ? <TabsContent value="sources"><EmptyState><EmptyStateGreeting>{text.noSources}</EmptyStateGreeting><p className="text-muted-foreground text-center">{text.sourcesHelp}</p></EmptyState></TabsContent> : null}<TabsContent value="artifacts"><EmptyState><EmptyStateGreeting>{text.noArtifacts}</EmptyStateGreeting><p className="text-muted-foreground text-center">{text.artifactsHelp}</p></EmptyState></TabsContent></Tabs></div>
  );
};
