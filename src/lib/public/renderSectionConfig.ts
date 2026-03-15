import type { CSSProperties } from "react";
import type { SectionProps } from "@/types/sections";
import {
  getSafeBackgroundDimPercent,
  getSafeBackgroundImageRenderMode,
  getSafeBackgroundImageUrl,
  getSafeBackgroundMode,
  getSafeBoolean,
  getSafeColor,
  getSafeFontSizePx,
  getSafeHref,
  getSafeSectionGap
} from "./renderSectionsUtils";

export type RenderableSectionConfigInput = {
  id: string;
  type: string;
  enabled?: boolean | null;
  props?: unknown;
};

function getSafePxValue(value: unknown, min: number, max: number) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) return undefined;
  return Math.min(max, Math.max(min, numeric));
}

export function getSectionLayoutConfig(
  sections: RenderableSectionConfigInput[]
) {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;

  const rawWidth =
    typeof pageStyleProps.contentWidth === "string"
      ? pageStyleProps.contentWidth
      : "default";

  const contentWidth =
    rawWidth === "narrow" ||
    rawWidth === "wide" ||
    rawWidth === "wider" ||
    rawWidth === "full"
      ? rawWidth
      : "default";

  return {
    contentWidth,
    sectionGapPx: getSafeSectionGap(pageStyleProps.sectionGapPx),
    showPageTitle: getSafeBoolean(pageStyleProps.showPageTitle, true)
  };
}

export function getSectionBackgroundStyle(
  sections: RenderableSectionConfigInput[]
): CSSProperties | undefined {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;
  const backgroundMode = getSafeBackgroundMode(pageStyleProps.backgroundMode);
  const backgroundImageRenderMode = getSafeBackgroundImageRenderMode(
    pageStyleProps.backgroundImageRenderMode
  );
  const backgroundColor = getSafeColor(pageStyleProps.backgroundColor);
  const backgroundImageUrl = getSafeBackgroundImageUrl(
    pageStyleProps.backgroundImageUrl
  );
  const backgroundImageDimPercent = getSafeBackgroundDimPercent(
    pageStyleProps.backgroundImageDimPercent
  );

  const useColor = backgroundMode === "color" || backgroundMode === "both";
  const useImage = backgroundMode === "image" || backgroundMode === "both";

  const appliedColor = useColor ? backgroundColor : undefined;
  const appliedImage = useImage ? backgroundImageUrl : undefined;

  if (!appliedColor && !appliedImage) return undefined;

  const style: CSSProperties = {
    ...(appliedColor ? { backgroundColor: appliedColor } : {})
  };

  if (appliedImage) {
    const escaped = appliedImage.replace(/"/g, '\\"');
    const imageRepeat =
      backgroundImageRenderMode === "tile" ? "repeat" : "no-repeat";
    const imageSize = backgroundImageRenderMode === "cover" ? "cover" : "auto";
    const imagePosition =
      backgroundImageRenderMode === "cover" ? "center" : "top left";

    if (backgroundImageDimPercent > 0) {
      const alpha = Number((backgroundImageDimPercent / 100).toFixed(2));
      style.backgroundImage = `linear-gradient(rgba(255, 255, 255, ${alpha}), rgba(255, 255, 255, ${alpha})), url("${escaped}")`;
      style.backgroundRepeat = `no-repeat, ${imageRepeat}`;
      style.backgroundSize = `cover, ${imageSize}`;
      style.backgroundPosition = `center, ${imagePosition}`;
    } else {
      style.backgroundImage = `url("${escaped}")`;
      style.backgroundRepeat = imageRepeat;
      style.backgroundSize = imageSize;
      style.backgroundPosition = imagePosition;
    }
  }

  return style;
}

export function getSectionNavigationStyle(
  sections: RenderableSectionConfigInput[]
) {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;

  return {
    menuTextColor: getSafeColor(pageStyleProps.menuTextColor),
    menuHoverColor: getSafeColor(pageStyleProps.menuHoverColor),
    menuFontSizePx: getSafeFontSizePx(pageStyleProps.menuFontSizePx),
    dividerColor: getSafeColor(pageStyleProps.dividerColor)
  };
}

export function getSectionRichTextStyle(
  sections: RenderableSectionConfigInput[]
): CSSProperties | undefined {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;

  const quoteBackgroundColor = getSafeColor(
    pageStyleProps.quoteBackgroundColor
  );
  const quoteBorderColor = getSafeColor(pageStyleProps.quoteBorderColor);
  const quoteBorderWidthPx = getSafePxValue(
    pageStyleProps.quoteBorderWidthPx,
    1,
    12
  );
  const quoteBorderRadiusPx = getSafePxValue(
    pageStyleProps.quoteBorderRadiusPx,
    0,
    24
  );
  const quotePaddingYPx = getSafePxValue(pageStyleProps.quotePaddingYPx, 0, 24);
  const quotePaddingXPx = getSafePxValue(pageStyleProps.quotePaddingXPx, 0, 36);

  if (
    !quoteBackgroundColor &&
    !quoteBorderColor &&
    quoteBorderWidthPx === undefined &&
    quoteBorderRadiusPx === undefined &&
    quotePaddingYPx === undefined &&
    quotePaddingXPx === undefined
  ) {
    return undefined;
  }

  const style: CSSProperties = {};
  if (quoteBackgroundColor) {
    (style as Record<string, string>)["--rich-quote-bg"] = quoteBackgroundColor;
  }
  if (quoteBorderColor) {
    (style as Record<string, string>)["--rich-quote-border"] = quoteBorderColor;
  }
  if (quoteBorderWidthPx !== undefined) {
    (style as Record<string, string>)["--rich-quote-border-width"] =
      `${quoteBorderWidthPx}px`;
  }
  if (quoteBorderRadiusPx !== undefined) {
    (style as Record<string, string>)["--rich-quote-radius"] =
      `${quoteBorderRadiusPx}px`;
  }
  if (quotePaddingYPx !== undefined) {
    (style as Record<string, string>)["--rich-quote-padding-y"] =
      `${quotePaddingYPx}px`;
  }
  if (quotePaddingXPx !== undefined) {
    (style as Record<string, string>)["--rich-quote-padding-x"] =
      `${quotePaddingXPx}px`;
  }

  return style;
}

export function getSectionBrandingConfig(
  sections: RenderableSectionConfigInput[]
) {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;

  const brandName =
    typeof pageStyleProps.brandName === "string"
      ? pageStyleProps.brandName.trim()
      : "";
  const logoHeightRaw = pageStyleProps.brandLogoHeightPx;
  const brandLogoHeightPx =
    typeof logoHeightRaw === "number" && Number.isFinite(logoHeightRaw)
      ? Math.min(96, Math.max(20, logoHeightRaw))
      : typeof logoHeightRaw === "string"
        ? Math.min(96, Math.max(20, Number(logoHeightRaw) || 32))
        : 32;

  return {
    brandName,
    brandHref: getSafeHref(pageStyleProps.brandHref),
    brandLogoUrl: getSafeBackgroundImageUrl(pageStyleProps.brandLogoUrl),
    brandLogoHeightPx
  };
}

export function getPageBackgroundColor(
  sections: RenderableSectionConfigInput[]
): string | undefined {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;
  return getSafeColor(pageStyleProps.backgroundColor);
}
