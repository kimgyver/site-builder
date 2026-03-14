import type { Editor } from "@tiptap/core";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  SLASH_COMMANDS,
  executeSlashCommand,
  type SlashCommand,
  type SlashMatch
} from "./slashCommands";

export function getFilteredSlashCommands(slashMatch: SlashMatch | null) {
  if (!slashMatch) return [];

  const q = slashMatch.query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter(command => {
    if (command.label.toLowerCase().includes(q)) return true;
    return command.keywords.some(keyword => keyword.includes(q));
  });
}

export function runSlashCommand(params: {
  editor: Editor;
  slashMatch: SlashMatch | null;
  command: SlashCommand;
  setSlashMatch: (value: SlashMatch | null) => void;
  setSlashActiveIndex: (value: number) => void;
}) {
  const { editor, slashMatch, command, setSlashMatch, setSlashActiveIndex } =
    params;
  if (!slashMatch) return;

  editor
    .chain()
    .focus()
    .deleteRange({ from: slashMatch.from, to: slashMatch.to })
    .run();
  executeSlashCommand(editor, command.id);
  setSlashMatch(null);
  setSlashActiveIndex(0);
}

export function handleSlashEditorKeyDown(params: {
  event: ReactKeyboardEvent<HTMLDivElement>;
  slashMatch: SlashMatch | null;
  slashActiveIndex: number;
  filteredSlashCommands: SlashCommand[];
  setSlashMatch: (value: SlashMatch | null) => void;
  setSlashActiveIndex: (value: number | ((prev: number) => number)) => void;
  onSelectCommand: (command: SlashCommand) => void;
}) {
  const {
    event,
    slashMatch,
    slashActiveIndex,
    filteredSlashCommands,
    setSlashMatch,
    setSlashActiveIndex,
    onSelectCommand
  } = params;

  if (!slashMatch) return;

  if (!filteredSlashCommands.length) {
    if (event.key === "Escape") {
      event.preventDefault();
      setSlashMatch(null);
      setSlashActiveIndex(0);
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setSlashActiveIndex(prev => (prev + 1) % filteredSlashCommands.length);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    setSlashActiveIndex(
      prev =>
        (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length
    );
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const index = Math.max(
      0,
      Math.min(slashActiveIndex, filteredSlashCommands.length - 1)
    );
    const selected = filteredSlashCommands[index];
    if (selected) {
      onSelectCommand(selected);
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    setSlashMatch(null);
    setSlashActiveIndex(0);
  }
}
