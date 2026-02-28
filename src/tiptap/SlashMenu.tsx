"use client";

import { useEffect, useMemo, useRef } from "react";

export type SectionSlashCommand = {
  id: string;
  label: string;
  keywords: string[];
  onRun: () => void;
};

export default function SlashMenu({
  position,
  query,
  commands,
  onClose
}: {
  position: { top: number; left: number } | null;
  query: string;
  commands: SectionSlashCommand[];
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return commands;
    return commands.filter(command => {
      if (command.label.toLowerCase().includes(normalizedQuery)) return true;
      return command.keywords.some(k =>
        k.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [commands, normalizedQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-72 rounded-md border border-zinc-300 bg-white p-1 text-xs shadow-lg"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="Add block"
    >
      {filtered.length === 0 ? (
        <div className="px-2 py-1 text-zinc-500">No results</div>
      ) : (
        <div ref={listRef} className="max-h-64 overflow-y-auto">
          {filtered.map(command => (
            <button
              key={command.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                command.onRun();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-zinc-700 hover:bg-zinc-100"
            >
              <span>{command.label}</span>
              <span className="text-[10px] text-zinc-400">{command.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
