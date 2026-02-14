import type { RefObject } from "react";
import type { SlashCommand, SlashMatch } from "./slashCommands";

interface SlashMenuProps {
  slashMatch: SlashMatch | null;
  filteredSlashCommands: SlashCommand[];
  slashActiveIndex: number;
  slashListRef: RefObject<HTMLDivElement | null>;
  onRunSlashCommand: (command: SlashCommand) => void;
}

export function SlashMenu({
  slashMatch,
  filteredSlashCommands,
  slashActiveIndex,
  slashListRef,
  onRunSlashCommand
}: SlashMenuProps) {
  if (!slashMatch) return null;

  return (
    <div className="absolute top-2 left-2 z-20 w-64 rounded-md border border-zinc-300 bg-white p-1 text-xs shadow-lg">
      {filteredSlashCommands.length === 0 ? (
        <div className="px-2 py-1 text-zinc-500">No block found</div>
      ) : (
        <div ref={slashListRef} className="max-h-52 overflow-y-auto">
          {filteredSlashCommands.map((command, index) => (
            <button
              key={command.id}
              data-slash-index={index}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onRunSlashCommand(command)}
              className={
                "flex w-full items-center justify-between rounded px-2 py-1 text-left " +
                (index === slashActiveIndex
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100")
              }
            >
              <span>{command.label}</span>
              <span className="text-[10px] text-zinc-400">/{command.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
