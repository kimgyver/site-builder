import type { Editor } from "@tiptap/core";
import {
  clearCellBackgroundColor as clearCellBackgroundColorCommand,
  clearCellBorderColor as clearCellBorderColorCommand,
  clearFontFamily as clearFontFamilyCommand,
  insertImagePrompt,
  insertTable as insertTableCommand,
  setCellBackgroundColor as setCellBackgroundColorCommand,
  setCellBorderColor as setCellBorderColorCommand,
  setCellBorderNormal as setCellBorderNormalCommand,
  setCellBorderTransparent as setCellBorderTransparentCommand,
  setCellBorderWidth as setCellBorderWidthCommand,
  setFontFamily as setFontFamilyCommand,
  setFontSize as setFontSizeCommand,
  setHighlightColor as setHighlightColorCommand,
  setImageAlign as setImageAlignCommand,
  setImageWidth as setImageWidthCommand,
  setTableAlign as setTableAlignCommand,
  setOrUnsetLink as setOrUnsetLinkCommand,
  setTextColor as setTextColorCommand
} from "./editorCommands";
import { applyTextPresetToEditor } from "./textPreset";

type CreateEditorActionsParams = {
  editor: Editor;
  selectedImagePos: number | null;
  getLastTextSelection: () => { from: number; to: number } | null;
  getSelectedTableCellPositions: () => number[] | null;
  setParagraphStyleValue: (value: "body" | "lead" | "quote") => void;
  setParagraphSpacingValue: (value: "compact" | "normal" | "relaxed") => void;
  setFontFamilyValue: (value: string) => void;
  setFontSizeValue: (value: string) => void;
  setTextColorValue: (value: string) => void;
  setTextPresetValue: (value: string) => void;
};

export function createEditorActions({
  editor,
  selectedImagePos,
  getLastTextSelection,
  getSelectedTableCellPositions,
  setParagraphStyleValue,
  setParagraphSpacingValue,
  setFontFamilyValue,
  setFontSizeValue,
  setTextColorValue,
  setTextPresetValue
}: CreateEditorActionsParams) {
  const setOrUnsetLink = () => setOrUnsetLinkCommand(editor);

  const setTextColor = (color: string) =>
    setTextColorCommand(editor, getLastTextSelection(), color);

  const setParagraphStyle = (style: "body" | "lead" | "quote") => {
    editor
      .chain()
      .focus()
      .setParagraph()
      .updateAttributes("paragraph", { styleVariant: style })
      .run();
    setParagraphStyleValue(style);
  };

  const setParagraphSpacing = (spacing: "compact" | "normal" | "relaxed") => {
    editor
      .chain()
      .focus()
      .setParagraph()
      .updateAttributes("paragraph", { spacingPreset: spacing })
      .run();
    setParagraphSpacingValue(spacing);
  };

  const applyTextPreset = (preset: string) => {
    applyTextPresetToEditor(editor, preset, {
      setFontFamilyValue,
      setFontSizeValue,
      setTextColorValue,
      setTextPresetValue
    });
  };

  const setFontFamily = (fontFamily: string) =>
    setFontFamilyCommand(editor, getLastTextSelection(), fontFamily);

  const clearFontFamily = () =>
    clearFontFamilyCommand(editor, getLastTextSelection());

  const setFontSize = (fontSize: string) =>
    setFontSizeCommand(editor, getLastTextSelection(), fontSize);

  const setHighlightColor = (color: string) =>
    setHighlightColorCommand(editor, getLastTextSelection(), color);

  const setCellBackgroundColor = (color: string) =>
    setCellBackgroundColorCommand(
      editor,
      color,
      getSelectedTableCellPositions()
    );

  const clearCellBackgroundColor = () =>
    clearCellBackgroundColorCommand(editor, getSelectedTableCellPositions());

  const setCellBorderTransparent = () =>
    setCellBorderTransparentCommand(editor, getSelectedTableCellPositions());

  const setCellBorderNormal = () =>
    setCellBorderNormalCommand(editor, getSelectedTableCellPositions());

  const setCellBorderColor = (color: string) =>
    setCellBorderColorCommand(editor, color, getSelectedTableCellPositions());

  const clearCellBorderColor = () =>
    clearCellBorderColorCommand(editor, getSelectedTableCellPositions());

  const setCellBorderWidth = (width: number) =>
    setCellBorderWidthCommand(editor, width, getSelectedTableCellPositions());

  const insertImage = () => insertImagePrompt(editor);

  const setImageWidth = (percent: number | null) =>
    setImageWidthCommand(editor, selectedImagePos, percent);

  const setImageAlign = (align: "left" | "center" | "right") =>
    setImageAlignCommand(editor, selectedImagePos, align);

  const insertTable = () => insertTableCommand(editor);

  const setTableAlign = (align: "left" | "center" | "right") =>
    setTableAlignCommand(editor, align);

  return {
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
  };
}
