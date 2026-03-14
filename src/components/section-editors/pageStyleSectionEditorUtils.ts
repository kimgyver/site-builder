export function getImageUrlFromPastedContent(
  text: string,
  html: string
): string | undefined {
  const htmlMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch?.[1]) {
    return htmlMatch[1].trim();
  }

  const textMatch = text.match(
    /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+|https?:\/\/[^\s"')]+|\/[^\s"')]+/i
  );
  if (textMatch?.[0]) {
    return textMatch[0].trim();
  }

  return undefined;
}

export function isSupportedBackgroundImageValue(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (
    /^data:image\/(png|jpe?g|webp|gif|bmp|avif);base64,[a-z0-9+/=\s]+$/i.test(
      raw
    )
  ) {
    return raw.length <= 2_500_000;
  }
  if (raw.startsWith("/")) return true;
  return /^https?:\/\//i.test(raw);
}

export function readClipboardImageAsDataUrl(
  items: DataTransferItemList
): Promise<string | undefined> {
  const imageItem = Array.from(items).find(item =>
    item.type.toLowerCase().startsWith("image/")
  );
  const file = imageItem?.getAsFile();
  if (!file) return Promise.resolve(undefined);

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function getBackgroundPreviewStyles(params: {
  backgroundImageRenderMode: string;
  backgroundImageDimPercent: number;
  backgroundImageUrl: string;
}) {
  const {
    backgroundImageRenderMode,
    backgroundImageDimPercent,
    backgroundImageUrl
  } = params;

  const previewRepeat =
    backgroundImageRenderMode === "tile" ? "repeat" : "no-repeat";
  const previewSize = backgroundImageRenderMode === "cover" ? "cover" : "auto";
  const previewPosition =
    backgroundImageRenderMode === "cover" ? "center" : "top left";
  const previewDimAlpha = Number((backgroundImageDimPercent / 100).toFixed(2));
  const escapedPreviewUrl = backgroundImageUrl.replace(/"/g, '\\"');

  const previewBackgroundImage =
    backgroundImageDimPercent > 0
      ? `linear-gradient(rgba(255, 255, 255, ${previewDimAlpha}), rgba(255, 255, 255, ${previewDimAlpha})), url("${escapedPreviewUrl}")`
      : `url("${escapedPreviewUrl}")`;

  const previewBackgroundRepeat =
    backgroundImageDimPercent > 0
      ? `no-repeat, ${previewRepeat}`
      : previewRepeat;

  const previewBackgroundSize =
    backgroundImageDimPercent > 0 ? `cover, ${previewSize}` : previewSize;

  const previewBackgroundPosition =
    backgroundImageDimPercent > 0
      ? `center, ${previewPosition}`
      : previewPosition;

  return {
    previewBackgroundImage,
    previewBackgroundRepeat,
    previewBackgroundSize,
    previewBackgroundPosition
  };
}

export function derivePageStyleEditorState(params: {
  props: Record<string, unknown>;
  libraryMedia: Array<{ url: string }>;
  isImageLikeUrl: (url: string) => boolean;
  isEmbeddedDataImage: (url: string) => boolean;
}) {
  const { props, libraryMedia, isImageLikeUrl, isEmbeddedDataImage } = params;

  const backgroundMode =
    props.backgroundMode === "color" ||
    props.backgroundMode === "image" ||
    props.backgroundMode === "both"
      ? String(props.backgroundMode)
      : "both";

  const backgroundImageUrl =
    typeof props.backgroundImageUrl === "string"
      ? props.backgroundImageUrl
      : "";

  const backgroundImageRenderMode =
    props.backgroundImageRenderMode === "cover" ||
    props.backgroundImageRenderMode === "original" ||
    props.backgroundImageRenderMode === "tile"
      ? String(props.backgroundImageRenderMode)
      : "cover";

  const backgroundColor =
    typeof props.backgroundColor === "string"
      ? props.backgroundColor
      : "#f8fafc";

  const imageCandidates = libraryMedia.filter(item => isImageLikeUrl(item.url));
  const imageModeEnabled =
    backgroundMode === "image" || backgroundMode === "both";
  const hasImageValue = backgroundImageUrl.trim().length > 0;
  const imageValueValid = isSupportedBackgroundImageValue(backgroundImageUrl);
  const isDataImageValue = /^data:image\//i.test(backgroundImageUrl.trim());
  const normalizedCurrentImageUrl = backgroundImageUrl.trim();
  const hasCurrentImageInCandidates = imageCandidates.some(
    item => item.url === normalizedCurrentImageUrl
  );

  const imageCandidatesWithCurrent =
    imageValueValid &&
    isImageLikeUrl(normalizedCurrentImageUrl) &&
    normalizedCurrentImageUrl.length > 0 &&
    !hasCurrentImageInCandidates
      ? [
          {
            url: normalizedCurrentImageUrl,
            label: isEmbeddedDataImage(normalizedCurrentImageUrl)
              ? "Current page · data:image;base64,..."
              : normalizedCurrentImageUrl.length > 84
                ? `Current page · ${normalizedCurrentImageUrl.slice(0, 81)}...`
                : `Current page · ${normalizedCurrentImageUrl}`
          },
          ...imageCandidates
        ]
      : imageCandidates;

  const backgroundImageDimPercent =
    typeof props.backgroundImageDimPercent === "number"
      ? props.backgroundImageDimPercent
      : 0;

  return {
    backgroundMode,
    backgroundImageUrl,
    backgroundImageRenderMode,
    backgroundColor,
    imageCandidatesWithCurrent,
    imageModeEnabled,
    hasImageValue,
    imageValueValid,
    isDataImageValue,
    backgroundImageDimPercent
  };
}
