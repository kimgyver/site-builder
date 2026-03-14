import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Editor } from "@tiptap/core";
import {
  detectTextPreset,
  getSelectedTableCellPositions,
  normalizeColorToHex,
  syncTableAlignmentInDom
} from "./editorFormattingUtils";

type UseTiptapSelectionSyncParams = {
  editor: Editor | null;
  lastTextSelectionRef: MutableRefObject<{ from: number; to: number } | null>;
  lastSelectedTableCellPositionsRef: MutableRefObject<number[] | null>;
  setTextPresetValue: (value: string) => void;
  setParagraphStyleValue: (value: "body" | "lead" | "quote") => void;
  setParagraphSpacingValue: (value: "compact" | "normal" | "relaxed") => void;
  setFontFamilyValue: (value: string) => void;
  setFontSizeValue: (value: string) => void;
  setTextColorValue: (value: string) => void;
  setHighlightColorValue: (value: string) => void;
  setCellBgColorValue: (value: string) => void;
  setTableBorderColorValue: (value: string) => void;
  setTableBorderWidthValue: (value: number) => void;
  bumpSelectionTick: (updater: (prev: number) => number) => void;
};

export function useTiptapSelectionSync({
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
}: UseTiptapSelectionSyncParams) {
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

      const textStyleAttrs = editor.getAttributes("textStyle") as Record<
        string,
        unknown
      >;

      const paragraphAttrs = editor.getAttributes("paragraph") as Record<
        string,
        unknown
      >;
      const currentParagraphStyle = paragraphAttrs.styleVariant;
      const currentParagraphSpacing = paragraphAttrs.spacingPreset;
      if (
        currentParagraphStyle === "lead" ||
        currentParagraphStyle === "quote"
      ) {
        setParagraphStyleValue(currentParagraphStyle);
      } else {
        setParagraphStyleValue("body");
      }
      if (
        currentParagraphSpacing === "compact" ||
        currentParagraphSpacing === "relaxed"
      ) {
        setParagraphSpacingValue(currentParagraphSpacing);
      } else {
        setParagraphSpacingValue("normal");
      }

      setTextPresetValue(detectTextPreset(editor));

      const activeFontFamily = textStyleAttrs.fontFamily;
      if (typeof activeFontFamily === "string" && activeFontFamily.trim()) {
        setFontFamilyValue(activeFontFamily.trim());
      } else {
        setFontFamilyValue("default");
      }

      const activeFontSize = textStyleAttrs.fontSize;
      if (typeof activeFontSize === "string") {
        const parsed = Number.parseFloat(
          activeFontSize.replace(/[^0-9.]/g, "")
        );
        if (Number.isFinite(parsed)) {
          setFontSizeValue(
            String(Math.max(8, Math.min(96, Math.round(parsed))))
          );
        } else {
          setFontSizeValue("16");
        }
      } else {
        setFontSizeValue("16");
      }

      const activeTextColorHex = normalizeColorToHex(textStyleAttrs.color);
      setTextColorValue(activeTextColorHex ?? "#111827");

      const highlightAttrs = editor.getAttributes("highlight") as Record<
        string,
        unknown
      >;
      const activeHighlightHex = normalizeColorToHex(highlightAttrs.color);
      setHighlightColorValue(activeHighlightHex ?? "#fde68a");

      lastSelectedTableCellPositionsRef.current =
        getSelectedTableCellPositions(editor);

      bumpSelectionTick(prev => (prev + 1) % 1000000);
    };

    const { from, to } = editor.state.selection;
    if (from !== to) {
      lastTextSelectionRef.current = { from, to };
    } else if (!lastTextSelectionRef.current) {
      lastTextSelectionRef.current = { from, to };
    }

    lastSelectedTableCellPositionsRef.current =
      getSelectedTableCellPositions(editor);

    editor.on("selectionUpdate", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
    };
  }, [
    editor,
    bumpSelectionTick,
    lastSelectedTableCellPositionsRef,
    lastTextSelectionRef,
    setCellBgColorValue,
    setFontFamilyValue,
    setFontSizeValue,
    setHighlightColorValue,
    setParagraphSpacingValue,
    setParagraphStyleValue,
    setTableBorderColorValue,
    setTableBorderWidthValue,
    setTextColorValue,
    setTextPresetValue
  ]);
}
