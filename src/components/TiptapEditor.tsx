"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor as CoreEditor } from "@tiptap/core";
import type { TiptapEditorProps } from "@/types/components";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TableRow } from "@tiptap/extension-table";
import { ResizableImage } from "./tiptap/ResizableImage";
import { ColoredTableCell } from "./tiptap/ColoredTableCell";
import { ResizableTableHeader } from "./tiptap/ResizableTableHeader";
import { AlignedTable } from "./tiptap/AlignedTable";
import { WebPasteTables } from "./tiptap/WebPasteTables";
import { ClickSelectImage } from "./tiptap/ClickSelectImage";
import { EditorToolbar } from "./tiptap/EditorToolbar";
import { SlashMenu } from "./tiptap/SlashMenu";
import {
  SLASH_COMMANDS,
  executeSlashCommand,
  getSlashMatchFromEditor,
  type SlashCommand,
  type SlashMatch
} from "./tiptap/slashCommands";
import {
  clearCellBackgroundColor as clearCellBackgroundColorCommand,
  clearCellBorderColor as clearCellBorderColorCommand,
  clearHighlightColor as clearHighlightColorCommand,
  clearTextColor as clearTextColorCommand,
  insertImagePrompt,
  insertTable as insertTableCommand,
  setCellBackgroundColor as setCellBackgroundColorCommand,
  setCellBorderColor as setCellBorderColorCommand,
  setCellBorderNormal as setCellBorderNormalCommand,
  setCellBorderTransparent as setCellBorderTransparentCommand,
  setCellBorderWidth as setCellBorderWidthCommand,
  setHighlightColor as setHighlightColorCommand,
  setImageAlign as setImageAlignCommand,
  setImageWidth as setImageWidthCommand,
  setTableAlign as setTableAlignCommand,
  setOrUnsetLink as setOrUnsetLinkCommand,
  setTextColor as setTextColorCommand
} from "./tiptap/editorCommands";
import { getEditorDerivedState } from "./tiptap/editorDerivedState";

export function TiptapEditor({
  defaultValue = "",
  defaultDoc,
  placeholder,
  onChangeHtml,
  className,
  editorClassName
}: TiptapEditorProps) {
  const syncTableAlignmentInDom = (activeEditor: CoreEditor) => {
    activeEditor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "table") return;

      const domNode = activeEditor.view.nodeDOM(pos);
      const tableEl =
        domNode instanceof HTMLTableElement
          ? domNode
          : domNode instanceof HTMLElement
            ? domNode.querySelector("table")
            : null;

      if (!tableEl) return;

      const align = node.attrs.align as "left" | "center" | "right" | null;
      if (align !== "left" && align !== "center" && align !== "right") {
        tableEl.removeAttribute("data-align");
        tableEl.style.marginLeft = "";
        tableEl.style.marginRight = "";
        return;
      }

      tableEl.setAttribute("data-align", align);
      if (align === "center") {
        tableEl.style.marginLeft = "auto";
        tableEl.style.marginRight = "auto";
      } else if (align === "right") {
        tableEl.style.marginLeft = "auto";
        tableEl.style.marginRight = "0";
      } else {
        tableEl.style.marginLeft = "0";
        tableEl.style.marginRight = "auto";
      }
    });
  };

  const lastEmittedHtmlRef = useRef<string>(defaultValue || "");
  const lastPropagatedHtmlRef = useRef<string>(defaultValue || "");
  const lastDefaultValueRef = useRef<string>(defaultValue || "");
  const debounceTimerRef = useRef<number | null>(null);
  const slashListRef = useRef<HTMLDivElement | null>(null);
  const lastTextSelectionRef = useRef<{ from: number; to: number } | null>(
    null
  );
  const lastSelectedTableCellPositionsRef = useRef<number[] | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const highlightColorInputRef = useRef<HTMLInputElement | null>(null);
  const cellBgColorInputRef = useRef<HTMLInputElement | null>(null);
  const tableBorderColorInputRef = useRef<HTMLInputElement | null>(null);
  const [slashMatch, setSlashMatch] = useState<SlashMatch | null>(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [textColorValue, setTextColorValue] = useState("#111827");
  const [highlightColorValue, setHighlightColorValue] = useState("#fde68a");
  const [cellBgColorValue, setCellBgColorValue] = useState("#f4f4f5");
  const [tableBorderColorValue, setTableBorderColorValue] = useState("#e5e7eb");
  const [tableBorderWidthValue, setTableBorderWidthValue] = useState(1);
  const [, bumpSelectionTick] = useState(0);

  const normalize = (html: string) => html.replace(/\s+/g, " ").trim();

  const emitChange = (html: string, doc: unknown) => {
    if (!onChangeHtml) return;
    if (normalize(html) === normalize(lastPropagatedHtmlRef.current)) {
      return;
    }
    lastPropagatedHtmlRef.current = html;
    onChangeHtml(html, doc as Parameters<NonNullable<typeof onChangeHtml>>[1]);
  };

  const updateSlashMatch = (next: SlashMatch | null) => {
    setSlashMatch(prev => {
      if (prev?.query !== next?.query) {
        setSlashActiveIndex(0);
      }
      return next;
    });
  };

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4]
        },
        link: false,
        underline: false
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"]
      }),
      WebPasteTables,
      ClickSelectImage,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          loading: "lazy"
        }
      }),
      AlignedTable.configure({
        resizable: true
      }),
      TableRow,
      ResizableTableHeader,
      ColoredTableCell,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank"
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || ""
      })
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: (defaultDoc ?? defaultValue) || "",
    // Next.js App Router will render client components during SSR and hydrate.
    // TipTap requires explicitly disabling immediate render to avoid mismatches.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "rich-content editor max-w-none focus:outline-none " +
          (editorClassName ?? "")
      }
    },
    onUpdate: ({ editor }) => {
      updateSlashMatch(getSlashMatchFromEditor(editor));
      syncTableAlignmentInDom(editor);
      const html = editor.getHTML();
      const doc = editor.getJSON();
      lastEmittedHtmlRef.current = html;

      // Debounce to avoid re-rendering the parent on every keystroke,
      // which can disrupt selection/toolbar behavior.
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        emitChange(html, doc);
      }, 150);
    },
    onTransaction: ({ editor, transaction }) => {
      updateSlashMatch(getSlashMatchFromEditor(editor));
      syncTableAlignmentInDom(editor);
      if (
        !transaction.docChanged &&
        !transaction.getMeta("rowResize") &&
        !transaction.getMeta("tableAttrUpdate")
      ) {
        return;
      }

      const html = editor.getHTML();
      const doc = editor.getJSON();
      lastEmittedHtmlRef.current = html;
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      emitChange(html, doc);
    },
    onBlur: ({ editor }) => {
      updateSlashMatch(getSlashMatchFromEditor(editor));
      const html = editor.getHTML();
      const doc = editor.getJSON();
      lastEmittedHtmlRef.current = html;
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      emitChange(html, doc);
    }
  });

  // Selection changes (like clicking an image) do not trigger `onUpdate`,
  // so we need to re-render to show context toolbars.
  useEffect(() => {
    if (!editor) return;
    syncTableAlignmentInDom(editor);
    const rerender = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        lastTextSelectionRef.current = { from, to };
      } else if (!lastTextSelectionRef.current) {
        lastTextSelectionRef.current = { from, to };
      }

      const tableCellAttrs = editor.getAttributes("tableCell") as Record<
        string,
        unknown
      >;
      const tableHeaderAttrs = editor.getAttributes("tableHeader") as Record<
        string,
        unknown
      >;
      const activeTableAttrs =
        Object.keys(tableCellAttrs).length > 0
          ? tableCellAttrs
          : tableHeaderAttrs;

      const rawBorderWidth = activeTableAttrs.borderWidth;
      const parsedBorderWidth =
        rawBorderWidth === null || rawBorderWidth === undefined
          ? NaN
          : Number(String(rawBorderWidth).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(parsedBorderWidth)) {
        setTableBorderWidthValue(Math.max(1, Math.min(12, parsedBorderWidth)));
      }

      const borderColor = activeTableAttrs.borderColor;
      if (
        typeof borderColor === "string" &&
        /^#([0-9a-fA-F]{6})$/.test(borderColor)
      ) {
        setTableBorderColorValue(borderColor);
      }

      const bgColor = activeTableAttrs.backgroundColor;
      if (typeof bgColor === "string" && /^#([0-9a-fA-F]{6})$/.test(bgColor)) {
        setCellBgColorValue(bgColor);
      }

      const selectionWithCells = editor.state.selection as unknown as {
        forEachCell?: (
          fn: (node: { attrs: Record<string, unknown> }, pos: number) => void
        ) => void;
      };
      if (typeof selectionWithCells.forEachCell === "function") {
        const positions: number[] = [];
        selectionWithCells.forEachCell((_, pos) => {
          positions.push(pos);
        });
        lastSelectedTableCellPositionsRef.current = positions.length
          ? positions
          : null;
      } else {
        lastSelectedTableCellPositionsRef.current = null;
      }

      bumpSelectionTick(t => (t + 1) % 1000000);
    };
    const { from, to } = editor.state.selection;
    if (from !== to) {
      lastTextSelectionRef.current = { from, to };
    } else if (!lastTextSelectionRef.current) {
      lastTextSelectionRef.current = { from, to };
    }
    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
    };
  }, [editor, bumpSelectionTick, lastTextSelectionRef]);

  // Keep editor content in sync when parent changes (e.g., switching sections)
  useEffect(() => {
    if (!editor) return;
    const next = defaultValue || "";
    const previousProp = lastDefaultValueRef.current;

    if (normalize(next) === normalize(previousProp)) {
      return;
    }

    lastDefaultValueRef.current = next;
    const current = editor.getHTML();

    if (normalize(current) === normalize(next)) {
      lastEmittedHtmlRef.current = next;
      lastPropagatedHtmlRef.current = next;
      return;
    }

    // Never overwrite content while user is actively typing in this editor.
    if (editor.isFocused) {
      return;
    }

    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedHtmlRef.current = next;
    lastPropagatedHtmlRef.current = next;
  }, [defaultValue, editor]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!slashMatch) return;
    const list = slashListRef.current;
    if (!list) return;
    const activeEl = list.querySelector(
      `[data-slash-index="${slashActiveIndex}"]`
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [slashActiveIndex, slashMatch]);

  if (!editor) {
    return (
      <div className={"space-y-1 " + (className ?? "")}>
        <div className="h-8 animate-pulse rounded-md border border-zinc-200 bg-zinc-50" />
        <div className="min-h-45 w-full animate-pulse rounded-md border border-zinc-300 bg-white px-3 py-2">
          <div className="space-y-2 pt-1">
            <div className="h-3 w-11/12 rounded bg-zinc-200" />
            <div className="h-3 w-4/5 rounded bg-zinc-200" />
            <div className="h-3 w-3/5 rounded bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  const setOrUnsetLink = () => setOrUnsetLinkCommand(editor);

  const setTextColor = (color: string) =>
    setTextColorCommand(editor, lastTextSelectionRef.current, color);

  const clearTextColor = () =>
    clearTextColorCommand(editor, lastTextSelectionRef.current);

  const setHighlightColor = (color: string) =>
    setHighlightColorCommand(editor, lastTextSelectionRef.current, color);

  const clearHighlightColor = () =>
    clearHighlightColorCommand(editor, lastTextSelectionRef.current);

  const setCellBackgroundColor = (color: string) =>
    setCellBackgroundColorCommand(
      editor,
      color,
      lastSelectedTableCellPositionsRef.current
    );

  const clearCellBackgroundColor = () =>
    clearCellBackgroundColorCommand(
      editor,
      lastSelectedTableCellPositionsRef.current
    );

  const setCellBorderTransparent = () =>
    setCellBorderTransparentCommand(
      editor,
      lastSelectedTableCellPositionsRef.current
    );

  const setCellBorderNormal = () =>
    setCellBorderNormalCommand(
      editor,
      lastSelectedTableCellPositionsRef.current
    );

  const setCellBorderColor = (color: string) =>
    setCellBorderColorCommand(
      editor,
      color,
      lastSelectedTableCellPositionsRef.current
    );

  const clearCellBorderColor = () =>
    clearCellBorderColorCommand(
      editor,
      lastSelectedTableCellPositionsRef.current
    );

  const setCellBorderWidth = (width: number) =>
    setCellBorderWidthCommand(
      editor,
      width,
      lastSelectedTableCellPositionsRef.current
    );

  const insertImage = () => insertImagePrompt(editor);

  const setImageWidth = (percent: number | null) =>
    setImageWidthCommand(editor, selectedImagePos, percent);

  const setImageAlign = (align: "left" | "center" | "right") =>
    setImageAlignCommand(editor, selectedImagePos, align);

  const insertTable = () => insertTableCommand(editor);

  const setTableAlign = (align: "left" | "center" | "right") =>
    setTableAlignCommand(editor, align);

  const runSlashCommand = (command: SlashCommand) => {
    if (!slashMatch) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: slashMatch.from, to: slashMatch.to })
      .run();
    executeSlashCommand(editor, command.id);
    setSlashMatch(null);
    setSlashActiveIndex(0);
  };

  const filteredSlashCommands = (() => {
    if (!slashMatch) return [];

    const q = slashMatch.query.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;

    return SLASH_COMMANDS.filter(command => {
      if (command.label.toLowerCase().includes(q)) return true;
      return command.keywords.some(keyword => keyword.includes(q));
    });
  })();

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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
          (prev - 1 + filteredSlashCommands.length) %
          filteredSlashCommands.length
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
        runSlashCommand(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSlashMatch(null);
      setSlashActiveIndex(0);
    }
  };

  const {
    selectedImagePos,
    isImageActive,
    isTableActive,
    activeTextColor,
    activeBorderColor,
    effectiveImageWidth
  } = getEditorDerivedState(editor);

  return (
    <div className={"space-y-1 " + (className ?? "")}>
      <EditorToolbar
        editor={editor}
        isImageActive={isImageActive}
        effectiveImageWidth={effectiveImageWidth}
        isTableActive={isTableActive}
        activeTextColor={activeTextColor}
        activeBorderColor={activeBorderColor}
        textColorValue={textColorValue}
        highlightColorValue={highlightColorValue}
        cellBgColorValue={cellBgColorValue}
        tableBorderColorValue={tableBorderColorValue}
        tableBorderWidthValue={tableBorderWidthValue}
        textColorInputRef={textColorInputRef}
        highlightColorInputRef={highlightColorInputRef}
        cellBgColorInputRef={cellBgColorInputRef}
        tableBorderColorInputRef={tableBorderColorInputRef}
        onSetTextColor={color => {
          setTextColorValue(color);
          setTextColor(color);
        }}
        onClearTextColor={clearTextColor}
        onSetHighlightColor={color => {
          setHighlightColorValue(color);
          setHighlightColor(color);
        }}
        onClearHighlightColor={clearHighlightColor}
        onSetOrUnsetLink={setOrUnsetLink}
        onInsertImage={insertImage}
        onInsertTable={insertTable}
        onSetImageWidth={setImageWidth}
        onSetImageAlign={setImageAlign}
        onSetTableAlign={setTableAlign}
        onSetCellBackgroundColor={color => {
          setCellBgColorValue(color);
          setCellBackgroundColor(color);
        }}
        onClearCellBackgroundColor={clearCellBackgroundColor}
        onSetCellBorderTransparent={setCellBorderTransparent}
        onSetCellBorderNormal={setCellBorderNormal}
        onSetCellBorderColor={color => {
          setTableBorderColorValue(color);
          setCellBorderColor(color);
        }}
        onClearCellBorderColor={clearCellBorderColor}
        onSetCellBorderWidth={width => {
          setTableBorderWidthValue(width);
          setCellBorderWidth(width);
        }}
      />

      <div className="relative min-h-45 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900">
        <SlashMenu
          slashMatch={slashMatch}
          filteredSlashCommands={filteredSlashCommands}
          slashActiveIndex={slashActiveIndex}
          slashListRef={slashListRef}
          onRunSlashCommand={runSlashCommand}
        />

        <EditorContent editor={editor} onKeyDown={handleEditorKeyDown} />
      </div>
    </div>
  );
}
