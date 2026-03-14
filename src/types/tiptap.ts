import type { RefObject } from "react";
import type { Editor } from "@tiptap/core";

export type SelectionRange = {
  from: number;
  to: number;
};

export type CellAlign = "left" | "center" | "right";

export type SlashMatch = {
  from: number;
  to: number;
  query: string;
};

export type SlashCommand = {
  id: string;
  label: string;
  keywords: string[];
};

export interface SlashMenuProps {
  slashMatch: SlashMatch | null;
  filteredSlashCommands: SlashCommand[];
  slashActiveIndex: number;
  slashListRef: RefObject<HTMLDivElement | null>;
  onRunSlashCommand: (command: SlashCommand) => void;
}

export interface EditorToolbarProps {
  editor: Editor;
  isImageActive: boolean;
  effectiveImageWidth: number | null;
  isTableActive: boolean;
  paragraphStyleValue: "body" | "lead" | "quote";
  paragraphSpacingValue: "compact" | "normal" | "relaxed";
  textPresetValue: string;
  activeTextColor?: string;
  activeBorderColor?: string | null;
  fontFamilyValue: string;
  fontSizeValue: string;
  textColorValue: string;
  highlightColorValue: string;
  cellBgColorValue: string;
  tableBorderColorValue: string;
  tableBorderWidthValue: number;
  textColorInputRef: RefObject<HTMLInputElement | null>;
  highlightColorInputRef: RefObject<HTMLInputElement | null>;
  cellBgColorInputRef: RefObject<HTMLInputElement | null>;
  tableBorderColorInputRef: RefObject<HTMLInputElement | null>;
  onSetTextColor: (color: string) => void;
  onSetParagraphStyle: (style: "body" | "lead" | "quote") => void;
  onSetParagraphSpacing: (spacing: "compact" | "normal" | "relaxed") => void;
  onApplyTextPreset: (preset: string) => void;
  onSetFontFamily: (fontFamily: string) => void;
  onClearFontFamily: () => void;
  onSetFontSize: (fontSize: string) => void;
  onSetHighlightColor: (color: string) => void;
  onSetOrUnsetLink: () => void;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onSetImageWidth: (width: number | null) => void;
  onSetImageAlign: (align: CellAlign) => void;
  onSetTableAlign: (align: CellAlign) => void;
  onSetCellBackgroundColor: (color: string) => void;
  onClearCellBackgroundColor: () => void;
  onSetCellBorderTransparent: () => void;
  onSetCellBorderNormal: () => void;
  onSetCellBorderColor: (color: string) => void;
  onClearCellBorderColor: () => void;
  onSetCellBorderWidth: (width: number) => void;
}
