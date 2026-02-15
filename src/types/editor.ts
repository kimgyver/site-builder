export interface EditorDerivedState {
  selectedImagePos: number | null;
  selectedImageAttrs: Record<string, unknown> | null;
  isImageActive: boolean;
  isTableActive: boolean;
  activeTextColor?: string;
  activeBorderColor: string | null;
  effectiveImageWidth: number | null;
}
