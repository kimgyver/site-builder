"use client";

import { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onChangeHtml?: (html: string) => void;
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  onChangeHtml
}: RichTextEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && defaultValue && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = defaultValue;
    }
  }, [defaultValue]);

  const syncValue = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setValue(html);
      if (onChangeHtml) {
        onChangeHtml(html);
      }
    }
  };

  const applyCommand = (command: string, arg?: string) => {
    if (typeof document === "undefined") return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    syncValue();
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyCommand("bold")}
          className="rounded px-1 py-0.5 hover:bg-zinc-200"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyCommand("italic")}
          className="rounded px-1 py-0.5 hover:bg-zinc-200"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => applyCommand("underline")}
          className="rounded px-1 py-0.5 hover:bg-zinc-200"
        >
          U
        </button>
      </div>
      <div
        ref={editorRef}
        className="min-h-45 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        contentEditable
        onInput={syncValue}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
