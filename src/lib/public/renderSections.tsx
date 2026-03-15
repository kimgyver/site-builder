import React, { type ReactNode } from "react";
import type { FaqItem, SectionProps } from "@/types/sections";
import {
  getMapsEmbedSrc,
  getSafeBoolean,
  getSafeColor,
  getSafeHref,
  getYouTubeEmbedSrc
} from "./renderSectionsUtils";
export {
  getPageBackgroundColor,
  getSectionBackgroundStyle,
  getSectionBrandingConfig,
  getSectionLayoutConfig,
  getSectionNavigationStyle,
  getSectionRichTextStyle
} from "./renderSectionConfig";

export type RenderableSection = {
  id: string;
  type: string;
  enabled?: boolean | null;
  props?: unknown;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRenderableHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  if (looksLikeHtml) return value;

  return trimmed
    .split(/\n\s*\n/)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderSection(
  section: RenderableSection,
  pageTitle: string
): ReactNode {
  const props = (section.props ?? {}) as SectionProps;

  if (section.type === "pageStyle") {
    return null;
  }

  const title = typeof props.title === "string" ? props.title : undefined;
  const subtitle =
    typeof props.subtitle === "string" ? props.subtitle : undefined;
  const html = typeof props.html === "string" ? props.html : "";
  const imageUrl = typeof props.url === "string" ? props.url : undefined;
  const imageAlt = typeof props.alt === "string" ? props.alt : "";
  const imageHref =
    typeof props.href === "string" && props.href.trim()
      ? props.href.trim()
      : undefined;
  const imageCaption =
    typeof props.caption === "string" ? props.caption : undefined;
  const imageAlign =
    props.align === "left" || props.align === "right" ? props.align : "center";

  if (section.type === "hero") {
    const heroBackgroundColor = getSafeColor(props.backgroundColor);
    const heroTextColor = getSafeColor(props.textColor);
    const heroSubtitleColor = getSafeColor(props.subtitleColor);
    const primaryCtaLabel =
      typeof props.primaryCtaLabel === "string"
        ? props.primaryCtaLabel.trim()
        : "";
    const primaryCtaHref = getSafeHref(props.primaryCtaHref);
    const secondaryCtaLabel =
      typeof props.secondaryCtaLabel === "string"
        ? props.secondaryCtaLabel.trim()
        : "";
    const secondaryCtaHref = getSafeHref(props.secondaryCtaHref);
    const primaryOpenInNewTab = getSafeBoolean(props.primaryCtaNewTab, false);
    const secondaryOpenInNewTab = getSafeBoolean(
      props.secondaryCtaNewTab,
      false
    );

    return (
      <section
        key={section.id}
        className="rounded-2xl bg-zinc-900 px-6 py-10 text-zinc-50"
        style={
          heroBackgroundColor || heroTextColor
            ? {
                ...(heroBackgroundColor
                  ? { backgroundColor: heroBackgroundColor }
                  : {}),
                ...(heroTextColor ? { color: heroTextColor } : {})
              }
            : undefined
        }
      >
        <h2 className="text-3xl font-semibold tracking-tight">
          {title || pageTitle}
        </h2>
      </section>
    );
  }

  if (
    section.type === "richText" ||
    section.type === "text" ||
    section.type === "rawHtml"
  ) {
    return (
      <div
        key={section.id}
        className="rich-content max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (section.type === "columns") {
    const leftHtml =
      typeof props.leftHtml === "string"
        ? toRenderableHtml(props.leftHtml)
        : "";
    const rightHtml =
      typeof props.rightHtml === "string"
        ? toRenderableHtml(props.rightHtml)
        : "";
    const thirdHtml =
      typeof props.thirdHtml === "string"
        ? toRenderableHtml(props.thirdHtml)
        : "";
    const desktopColumns = props.desktopColumns === 3 ? 3 : 2;
    const ratio =
      props.ratio === "2:1" ||
      props.ratio === "1:2" ||
      props.ratio === "2:1:1" ||
      props.ratio === "1:2:1" ||
      props.ratio === "1:1:2"
        ? props.ratio
        : desktopColumns === 3
          ? "1:1:1"
          : "1:1";
    const mobileMode =
      props.mobileMode === "customHtml" ? "customHtml" : "stack";
    const mobileHtml =
      typeof props.mobileHtml === "string"
        ? toRenderableHtml(props.mobileHtml)
        : "";
    const reverseOnMobile = props.reverseOnMobile === true;

    const gridClass =
      desktopColumns === 3
        ? ratio === "2:1:1"
          ? "lg:grid-cols-[2fr_1fr_1fr]"
          : ratio === "1:2:1"
            ? "lg:grid-cols-[1fr_2fr_1fr]"
            : ratio === "1:1:2"
              ? "lg:grid-cols-[1fr_1fr_2fr]"
              : "lg:grid-cols-3"
        : ratio === "2:1"
          ? "lg:grid-cols-[2fr_1fr]"
          : ratio === "1:2"
            ? "lg:grid-cols-[1fr_2fr]"
            : "lg:grid-cols-2";

    const reverseClass =
      mobileMode === "stack" && reverseOnMobile
        ? "[&>*:first-child]:order-2 [&>*:nth-child(2)]:order-1 lg:[&>*:first-child]:order-1 lg:[&>*:nth-child(2)]:order-2"
        : "";

    const desktopSection = (
      <section
        key={`${section.id}-desktop`}
        className={`grid grid-cols-1 gap-4 ${gridClass} ${reverseClass} ${mobileMode === "customHtml" ? "hidden lg:grid" : ""}`}
      >
        <div
          className="rich-content max-w-none"
          dangerouslySetInnerHTML={{ __html: leftHtml }}
        />
        <div
          className="rich-content max-w-none"
          dangerouslySetInnerHTML={{ __html: rightHtml }}
        />
        {desktopColumns === 3 ? (
          <div
            className="rich-content max-w-none"
            dangerouslySetInnerHTML={{ __html: thirdHtml }}
          />
        ) : null}
      </section>
    );

    if (mobileMode === "customHtml" && mobileHtml.trim()) {
      return (
        <div key={section.id}>
          <section
            key={`${section.id}-mobile`}
            className="rich-content max-w-none lg:hidden"
            dangerouslySetInnerHTML={{ __html: mobileHtml }}
          />
          {desktopSection}
        </div>
      );
    }

    return desktopSection;
  }

  if (section.type === "image") {
    if (!imageUrl) return null;

    const isYouTube =
      (typeof imageUrl === "string" && imageUrl.includes("youtube.com")) ||
      (typeof imageUrl === "string" && imageUrl.includes("youtu.be"));
    const isGoogleMaps =
      typeof imageUrl === "string" &&
      (imageUrl.includes("maps.google.com") ||
        imageUrl.startsWith("https://www.google.com/maps/embed?pb="));

    if (isYouTube || isGoogleMaps) {
      const provider = isGoogleMaps ? "maps" : "youtube";
      const src =
        provider === "maps"
          ? getMapsEmbedSrc(imageUrl)
          : getYouTubeEmbedSrc(imageUrl);
      if (!src) return null;
      const embedTitle = isGoogleMaps ? "Google Maps" : "YouTube video";
      return (
        <section key={section.id} className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <iframe
              src={src}
              title={embedTitle}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow={
                provider === "youtube"
                  ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  : undefined
              }
              allowFullScreen={provider === "youtube"}
              className="w-full"
              style={{ height: 420 }}
            />
          </div>
        </section>
      );
    }

    const imageNode = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={imageAlt}
        className="w-full rounded-lg border border-zinc-200 object-cover"
      />
    );

    const figureAlignClass =
      imageAlign === "left"
        ? "mr-auto"
        : imageAlign === "right"
          ? "ml-auto"
          : "mx-auto";

    return (
      <figure
        key={section.id}
        className={`w-full max-w-full space-y-2 ${figureAlignClass}`}
      >
        {imageHref ? (
          <a
            href={imageHref}
            className="block"
            aria-label={imageAlt || "Image link"}
          >
            {imageNode}
          </a>
        ) : (
          imageNode
        )}
        {imageCaption ? (
          <figcaption className="text-sm text-zinc-500">
            {imageCaption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (section.type === "callout") {
    const tone =
      props.tone === "success" ||
      props.tone === "warning" ||
      props.tone === "danger"
        ? props.tone
        : "info";
    const body = typeof props.body === "string" ? props.body : "";
    const calloutTitle =
      typeof props.title === "string" ? props.title : "Notice";

    const toneClass =
      tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : tone === "danger"
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-blue-200 bg-blue-50 text-blue-900";

    return (
      <section
        key={section.id}
        className={`rounded-xl border px-4 py-3 ${toneClass}`}
      >
        <h3 className="text-sm font-semibold">{calloutTitle}</h3>
        {body ? (
          <p className="mt-1 whitespace-pre-line text-sm">{body}</p>
        ) : null}
      </section>
    );
  }

  if (section.type === "accordion") {
    const items = Array.isArray(props.items) ? (props.items as FaqItem[]) : [];
    if (!items.length) return null;

    return (
      <section key={section.id} className="space-y-2">
        {title ? (
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        ) : null}
        <div className="space-y-2">
          {items.map((item, index) => (
            <details
              key={index}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2"
            >
              <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                {item.question ?? ""}
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">
                {item.answer ?? ""}
              </p>
            </details>
          ))}
        </div>
      </section>
    );
  }

  return (
    <pre
      key={section.id}
      className="overflow-x-auto rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
    >
      {JSON.stringify(section, null, 2)}
    </pre>
  );
}

export function renderSections(
  sections: RenderableSection[],
  pageTitle: string
) {
  return sections
    .filter(section => section.enabled !== false)
    .map(section => renderSection(section, pageTitle));
}

export function isExternalHref(href: string) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

export function localizeInternalHref(href: string, locale: string) {
  if (!href.startsWith("/")) return href;
  if (href === "/") return href;
  if (/^\/(en|ko)(\/|$)/.test(href)) return href;
  return `/${locale}${href}`;
}
