type PageStyleFullPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  backgroundColor: string;
  previewBackgroundImage: string;
  previewBackgroundRepeat: string;
  previewBackgroundPosition: string;
  previewBackgroundSize: string;
};

export function PageStyleFullPreviewModal({
  open,
  onClose,
  backgroundColor,
  previewBackgroundImage,
  previewBackgroundRepeat,
  previewBackgroundPosition,
  previewBackgroundSize
}: PageStyleFullPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded border border-white/30 bg-black/40 px-3 py-1 text-xs text-white hover:bg-black/60"
      >
        Close
      </button>
      <div
        role="img"
        aria-label="Full preview"
        className="h-full w-full"
        style={{
          backgroundColor,
          backgroundImage: previewBackgroundImage,
          backgroundRepeat: previewBackgroundRepeat,
          backgroundPosition: previewBackgroundPosition,
          backgroundSize: previewBackgroundSize
        }}
      />
    </div>
  );
}
