"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { TiptapEditorProps } from "@/types/components";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
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
  getSlashMatchFromEditor,
  type SlashMatch
} from "./tiptap/slashCommands";
import { getEditorDerivedState } from "./tiptap/editorDerivedState";
import { syncTableAlignmentInDom } from "./tiptap/editorFormattingUtils";
import { StyledParagraph } from "./tiptap/styledParagraph";
import { TiptapEditorSkeleton } from "./tiptap/TiptapEditorSkeleton";
import {
  getFilteredSlashCommands,
  handleSlashEditorKeyDown,
  runSlashCommand
} from "./tiptap/slashInteraction";
import { useTiptapSelectionSync } from "./tiptap/useTiptapSelectionSync";
import { createEditorActions } from "./tiptap/editorActions";

export function TiptapEditor({
  defaultValue = "",
  defaultDoc,
  placeholder,
  onChangeHtml,
  className,
  editorClassName,
  editorContainerStyle
}: TiptapEditorProps) {
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
  const [textPresetValue, setTextPresetValue] = useState("normal");
  const [paragraphStyleValue, setParagraphStyleValue] = useState<
    "body" | "lead" | "quote"
  >("body");
  const [paragraphSpacingValue, setParagraphSpacingValue] = useState<
    "compact" | "normal" | "relaxed"
  >("normal");
  const [fontFamilyValue, setFontFamilyValue] = useState("default");
  const [fontSizeValue, setFontSizeValue] = useState("16");
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
        paragraph: false,
        link: false,
        underline: false
      }),
      StyledParagraph,
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"]
      }),
      WebPasteTables,
      ClickSelectImage,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
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
      },
      handleDOMEvents: {
        dragstart: (_view, event) => {
          const targetNode = event.target;
          const targetElement =
            targetNode instanceof HTMLElement
              ? targetNode
              : targetNode instanceof Text
                ? targetNode.parentElement
                : null;
          if (!targetElement) return false;
          if (!targetElement.closest("td, th")) return false;
          event.preventDefault();
          return true;
        }
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
  // so we keep derived toolbar state in sync via a dedicated hook.
  useTiptapSelectionSync({
    editor,
    lastTextSelectionRef,
    lastSelectedTableCellPositionsRef,
    setTextPresetValue,
    setParagraphStyleValue,
    setParagraphSpacingValue,
    setFontFamilyValue,
    setFontSizeValue,
    setTextColorValue,
    setHighlightColorValue,
    setCellBgColorValue,
    setTableBorderColorValue,
    setTableBorderWidthValue,
    bumpSelectionTick
  });

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
    return <TiptapEditorSkeleton className={className} />;
  }

  const {
    selectedImagePos,
    isImageActive,
    isTableActive,
    activeTextColor,
    activeBorderColor,
    effectiveImageWidth
  } = getEditorDerivedState(editor);

  const {
    setOrUnsetLink,
    setTextColor,
    setParagraphStyle,
    setParagraphSpacing,
    applyTextPreset,
    setFontFamily,
    clearFontFamily,
    setFontSize,
    setHighlightColor,
    setCellBackgroundColor,
    clearCellBackgroundColor,
    setCellBorderTransparent,
    setCellBorderNormal,
    setCellBorderColor,
    clearCellBorderColor,
    setCellBorderWidth,
    insertImage,
    setImageWidth,
    setImageAlign,
    insertTable,
    setTableAlign
    // `createEditorActions` closes over refs for event handlers only.
    // eslint-disable-next-line react-hooks/refs
  } = createEditorActions({
    editor,
    selectedImagePos,
    getLastTextSelection: () => lastTextSelectionRef.current,
    getSelectedTableCellPositions: () =>
      lastSelectedTableCellPositionsRef.current,
    setParagraphStyleValue,
    setParagraphSpacingValue,
    setFontFamilyValue,
    setFontSizeValue,
    setTextColorValue,
    setTextPresetValue
  });

  const filteredSlashCommands = getFilteredSlashCommands(slashMatch);

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    handleSlashEditorKeyDown({
      event,
      slashMatch,
      slashActiveIndex,
      filteredSlashCommands,
      setSlashMatch,
      setSlashActiveIndex,
      onSelectCommand: command =>
        runSlashCommand({
          editor,
          slashMatch,
          command,
          setSlashMatch,
          setSlashActiveIndex: value => setSlashActiveIndex(value)
        })
    });
  };

  return (
    <div className={"space-y-1 " + (className ?? "")}>
      <EditorToolbar
        editor={editor}
        isImageActive={isImageActive}
        effectiveImageWidth={effectiveImageWidth}
        isTableActive={isTableActive}
        paragraphStyleValue={paragraphStyleValue}
        paragraphSpacingValue={paragraphSpacingValue}
        textPresetValue={textPresetValue}
        activeTextColor={activeTextColor}
        activeBorderColor={activeBorderColor}
        fontFamilyValue={fontFamilyValue}
        fontSizeValue={fontSizeValue}
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
        onSetParagraphStyle={setParagraphStyle}
        onSetParagraphSpacing={setParagraphSpacing}
        onApplyTextPreset={applyTextPreset}
        onSetFontFamily={fontFamily => {
          setFontFamilyValue(fontFamily);
          setFontFamily(fontFamily);
        }}
        onClearFontFamily={clearFontFamily}
        onSetFontSize={fontSize => {
          setFontSizeValue(fontSize);
          setFontSize(fontSize);
        }}
        onSetHighlightColor={color => {
          setHighlightColorValue(color);
          setHighlightColor(color);
        }}
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

      <div
        className="relative min-h-45 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 md:text-base md:leading-7"
        style={editorContainerStyle}
      >
        <SlashMenu
          slashMatch={slashMatch}
          filteredSlashCommands={filteredSlashCommands}
          slashActiveIndex={slashActiveIndex}
          slashListRef={slashListRef}
          onRunSlashCommand={command =>
            runSlashCommand({
              editor,
              slashMatch,
              command,
              setSlashMatch,
              setSlashActiveIndex: value => setSlashActiveIndex(value)
            })
          }
        />

        <EditorContent editor={editor} onKeyDown={handleEditorKeyDown} />
      </div>
    </div>
  );
}
