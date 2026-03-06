import type { EditorToolbarProps } from "@/types/tiptap";
import { useState } from "react";
import { ToolbarButton } from "./ToolbarButton";
import { deleteCurrentTable } from "./editorCommands";

export function EditorToolbar({
  editor,
  isImageActive,
  effectiveImageWidth,
  isTableActive,
  activeTextColor,
  activeBorderColor,
  textColorValue,
  highlightColorValue,
  cellBgColorValue,
  tableBorderColorValue,
  tableBorderWidthValue,
  textColorInputRef,
  highlightColorInputRef,
  cellBgColorInputRef,
  tableBorderColorInputRef,
  onSetTextColor,
  onClearTextColor,
  onSetHighlightColor,
  onClearHighlightColor,
  onSetOrUnsetLink,
  onInsertImage,
  onInsertTable,
  onSetImageWidth,
  onSetImageAlign,
  onSetTableAlign,
  onSetCellBackgroundColor,
  onClearCellBackgroundColor,
  onSetCellBorderTransparent,
  onSetCellBorderNormal,
  onSetCellBorderColor,
  onClearCellBorderColor,
  onSetCellBorderWidth
}: EditorToolbarProps) {
  const [showTextTools, setShowTextTools] = useState(false);
  const [showImageTools, setShowImageTools] = useState(false);
  const [showTableTools, setShowTableTools] = useState(false);
  const imageToolsVisible = showImageTools && isImageActive;
  const tableToolsVisible = showTableTools && isTableActive;

  return (
    <div className="space-y-2 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-2 text-xs text-zinc-700">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          label="Bold"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        />
        <ToolbarButton
          label="Italic"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        />
        <ToolbarButton
          label="Underline"
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton
          label="P"
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive("paragraph")}
        />
        <ToolbarButton
          label="H1"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
        />
        <ToolbarButton
          label="H2"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton
          label="• List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        />
        <ToolbarButton
          label="1. List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton
          label="Link"
          onClick={onSetOrUnsetLink}
          active={editor.isActive("link")}
        />
        <ToolbarButton
          label="Unlink"
          onClick={() =>
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
          }
          disabled={!editor.isActive("link")}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton label="Image" onClick={onInsertImage} />
        <ToolbarButton
          label="Table"
          onClick={onInsertTable}
          active={isTableActive}
        />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <ToolbarButton
          label={showTextTools ? "Hide Text Tools" : "Text Tools"}
          title="Text color, highlight, advanced headings, text align"
          onClick={() => setShowTextTools(prev => !prev)}
          active={showTextTools}
        />
        <ToolbarButton
          label={imageToolsVisible ? "Hide Image Tools" : "Image Tools"}
          title="Image width and alignment"
          onClick={() => setShowImageTools(prev => !prev)}
          active={imageToolsVisible}
          disabled={!isImageActive}
        />
        <ToolbarButton
          label={tableToolsVisible ? "Hide Table Tools" : "Table Tools"}
          title="Table align, cell style, row/column, merge/split"
          onClick={() => setShowTableTools(prev => !prev)}
          active={tableToolsVisible}
          disabled={!isTableActive}
        />
      </div>

      {showTextTools ? (
        <div className="flex flex-wrap items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1">
          <span className="px-1 text-[10px] font-medium text-zinc-500">
            Text
          </span>
          <ToolbarButton
            label="Text Color"
            title="Text Color"
            onClick={() => textColorInputRef.current?.click()}
            active={!!activeTextColor}
          />
          <input
            ref={textColorInputRef}
            type="color"
            value={textColorValue}
            onChange={e => onSetTextColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            aria-label="Text color"
          />
          <ToolbarButton
            label="Clear Text"
            title="Clear Text Color"
            onClick={onClearTextColor}
            disabled={!activeTextColor}
          />
          <ToolbarButton
            label="Highlight"
            title="Highlight"
            onClick={() => highlightColorInputRef.current?.click()}
            active={editor.isActive("highlight")}
          />
          <input
            ref={highlightColorInputRef}
            type="color"
            value={highlightColorValue}
            onChange={e => onSetHighlightColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            aria-label="Highlight color"
          />
          <ToolbarButton
            label="Clear HL"
            title="Clear Highlight"
            onClick={onClearHighlightColor}
            disabled={!editor.isActive("highlight")}
          />
          <span className="mx-1 h-5 w-px bg-zinc-300" />
          <ToolbarButton
            label="H3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
          />
          <ToolbarButton
            label="H4"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
            active={editor.isActive("heading", { level: 4 })}
          />
          <span className="mx-1 h-5 w-px bg-zinc-300" />
          <ToolbarButton
            label="Text L"
            title="Align Left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
          />
          <ToolbarButton
            label="Text C"
            title="Align Center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
          />
          <ToolbarButton
            label="Text R"
            title="Align Right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
          />
        </div>
      ) : null}

      {imageToolsVisible ? (
        <div className="flex flex-wrap items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1">
          <span className="px-1 text-[10px] font-medium text-zinc-500">
            Image
          </span>
          <span className="px-1 text-[11px] text-zinc-500">
            Width {effectiveImageWidth ? `${effectiveImageWidth}%` : "Auto"}
          </span>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={effectiveImageWidth ?? 100}
            onChange={e => onSetImageWidth(Number(e.target.value))}
            className="mx-1 h-5 w-28 accent-zinc-900"
            aria-label="Image width"
            disabled={!isImageActive}
          />
          <ToolbarButton
            label="Auto"
            onClick={() => onSetImageWidth(null)}
            disabled={!isImageActive}
          />
          <ToolbarButton
            label="Img L"
            title="Image Align Left"
            onClick={() => onSetImageAlign("left")}
            disabled={!isImageActive}
          />
          <ToolbarButton
            label="Img C"
            title="Image Align Center"
            onClick={() => onSetImageAlign("center")}
            disabled={!isImageActive}
          />
          <ToolbarButton
            label="Img R"
            title="Image Align Right"
            onClick={() => onSetImageAlign("right")}
            disabled={!isImageActive}
          />
        </div>
      ) : null}

      {tableToolsVisible ? (
        <div className="flex flex-wrap items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1">
          <span className="px-1 text-[10px] font-medium text-zinc-500">
            Table
          </span>
          <ToolbarButton
            label="L"
            title="Table Align: Left"
            onClick={() => onSetTableAlign("left")}
          />
          <ToolbarButton
            label="C"
            title="Table Align: Center"
            onClick={() => onSetTableAlign("center")}
          />
          <ToolbarButton
            label="R"
            title="Table Align: Right"
            onClick={() => onSetTableAlign("right")}
          />
          <ToolbarButton
            label="Merge"
            title="Merge Cells"
            onClick={() => editor.chain().focus().mergeCells().run()}
          />
          <ToolbarButton
            label="Split"
            title="Split Cell"
            onClick={() => editor.chain().focus().splitCell().run()}
          />
          <ToolbarButton
            label="Cell BG"
            title="Cell Background"
            onClick={() => cellBgColorInputRef.current?.click()}
          />
          <input
            ref={cellBgColorInputRef}
            type="color"
            value={cellBgColorValue}
            onChange={e => onSetCellBackgroundColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            aria-label="Cell background color"
          />
          <ToolbarButton
            label="BG Clear"
            title="Clear Cell Background"
            onClick={onClearCellBackgroundColor}
          />
          <ToolbarButton
            label="No Border"
            title="Hide Cell Border"
            onClick={onSetCellBorderTransparent}
          />
          <ToolbarButton
            label="Border"
            title="Restore Cell Border"
            onClick={onSetCellBorderNormal}
          />
          <ToolbarButton
            label="Border Color"
            title="Border Color"
            onClick={() => tableBorderColorInputRef.current?.click()}
            active={!!activeBorderColor}
          />
          <input
            ref={tableBorderColorInputRef}
            type="color"
            value={tableBorderColorValue}
            onChange={e => onSetCellBorderColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            aria-label="Table border color"
          />
          <ToolbarButton
            label="Border Clear"
            title="Clear Border Color"
            onClick={onClearCellBorderColor}
          />
          <span className="px-1 text-[11px] text-zinc-500">
            Border {tableBorderWidthValue}px
          </span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={tableBorderWidthValue}
            onChange={e => onSetCellBorderWidth(Number(e.target.value))}
            className="mx-1 h-5 w-20 accent-zinc-900"
            aria-label="Table border width"
          />
          <ToolbarButton
            label="+Row"
            title="Add Row Below"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          />
          <ToolbarButton
            label="+Col"
            title="Add Column Right"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          />
          <ToolbarButton
            label="-Row"
            title="Delete Current Row"
            onClick={() => editor.chain().focus().deleteRow().run()}
          />
          <ToolbarButton
            label="-Col"
            title="Delete Current Column"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          />
          <ToolbarButton
            label="DelTbl"
            title="Delete Table"
            onClick={() => deleteCurrentTable(editor)}
          />
        </div>
      ) : null}
    </div>
  );
}
