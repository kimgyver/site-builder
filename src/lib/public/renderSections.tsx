import type { CSSProperties, ReactNode } from "react";
import type { FaqItem, SectionProps } from "@/types/sections";

export type RenderableSection = {
  id: string;
  type: string;
  enabled?: boolean | null;
  props?: unknown;
};

function getSafeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    return color;
  }
  if (/^rgba?\(/i.test(color) || /^hsla?\(/i.test(color)) {
    return color;
  }
  return undefined;
}

function getSafeBackgroundImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function getSafeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function getSafeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return fallback;
}

function getSafeSectionGap(value: unknown): number {
  const fallback = 32;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(96, Math.max(8, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(96, Math.max(8, Math.round(parsed)));
    }
  }
  return fallback;
}

export function getSectionLayoutConfig(sections: RenderableSection[]) {
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
  sections: RenderableSection[]
): CSSProperties | undefined {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;
  const backgroundColor = getSafeColor(pageStyleProps.backgroundColor);
  const backgroundImageUrl = getSafeBackgroundImageUrl(
    pageStyleProps.backgroundImageUrl
  );

  if (!backgroundColor && !backgroundImageUrl) return undefined;

  const style: CSSProperties = {
    ...(backgroundColor ? { backgroundColor } : {})
  };

  if (backgroundImageUrl) {
    const escaped = backgroundImageUrl.replace(/"/g, '\\"');
    style.backgroundImage = `url("${escaped}")`;
    style.backgroundSize = "cover";
    style.backgroundRepeat = "no-repeat";
    style.backgroundPosition = "center";
  }

  return style;
}

function getSafeFontSizePx(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(24, Math.max(12, value));
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(24, Math.max(12, parsed));
    }
  }
  return undefined;
}

export function getSectionNavigationStyle(sections: RenderableSection[]) {
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

export function getSectionBrandingConfig(sections: RenderableSection[]) {
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

function getYouTubeEmbedSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    }
    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    }
    if (host === "youtube-nocookie.com") {
      const id = url.pathname.replace(/^\/embed\//, "").split("/")[0];
      if (!id) return null;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
    return null;
  } catch {
    return null;
  }
}

function getMapsEmbedSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (
      !host.includes("google.com") &&
      !host.includes("maps.google.com") &&
      !host.includes("maps.app.goo.gl")
    ) {
      return null;
    }
    if (url.pathname.includes("/maps/embed")) {
      return url.toString();
    }
    const pb = url.searchParams.get("pb");
    if (pb) {
      return `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
    }
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
    return null;
  } catch {
    return null;
  }
}

export function getPageBackgroundColor(
  sections: RenderableSection[]
): string | undefined {
  const pageStyleSection = sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;
  return getSafeColor(pageStyleProps.backgroundColor);
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
        {subtitle ? (
          <p
            className="mt-3 max-w-prose text-sm text-zinc-300"
            style={heroSubtitleColor ? { color: heroSubtitleColor } : undefined}
          >
            {subtitle}
          </p>
        ) : null}
        {(primaryCtaLabel && primaryCtaHref) ||
        (secondaryCtaLabel && secondaryCtaHref) ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {primaryCtaLabel && primaryCtaHref ? (
              <a
                href={primaryCtaHref}
                className="inline-flex rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900"
                target={primaryOpenInNewTab ? "_blank" : undefined}
                rel={primaryOpenInNewTab ? "noopener noreferrer" : undefined}
              >
                {primaryCtaLabel}
              </a>
            ) : null}
            {secondaryCtaLabel && secondaryCtaHref ? (
              <a
                href={secondaryCtaHref}
                className="inline-flex rounded-md border border-white/70 px-3 py-1.5 text-xs font-medium text-white"
                target={secondaryOpenInNewTab ? "_blank" : undefined}
                rel={secondaryOpenInNewTab ? "noopener noreferrer" : undefined}
              >
                {secondaryCtaLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  if (section.type === "embed") {
    const provider = props.provider === "maps" ? "maps" : "youtube";
    const src =
      provider === "maps"
        ? getMapsEmbedSrc(props.url)
        : getYouTubeEmbedSrc(props.url);
    if (!src) return null;

    const embedTitle =
      typeof props.title === "string" && props.title.trim()
        ? props.title.trim()
        : provider === "maps"
          ? "Google Maps"
          : "YouTube video";

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
    const leftHtml = typeof props.leftHtml === "string" ? props.leftHtml : "";
    const rightHtml =
      typeof props.rightHtml === "string" ? props.rightHtml : "";
    const ratio =
      props.ratio === "2:1" || props.ratio === "1:2" ? props.ratio : "1:1";
    const reverseOnMobile = props.reverseOnMobile === true;

    const gridClass =
      ratio === "2:1"
        ? "lg:grid-cols-[2fr_1fr]"
        : ratio === "1:2"
          ? "lg:grid-cols-[1fr_2fr]"
          : "lg:grid-cols-2";

    return (
      <section
        key={section.id}
        className={`grid grid-cols-1 gap-4 ${gridClass} ${reverseOnMobile ? "[&>*:first-child]:order-2 [&>*:last-child]:order-1 lg:[&>*:first-child]:order-1 lg:[&>*:last-child]:order-2" : ""}`}
      >
        <div
          className="rich-content max-w-none"
          dangerouslySetInnerHTML={{ __html: leftHtml }}
        />
        <div
          className="rich-content max-w-none"
          dangerouslySetInnerHTML={{ __html: rightHtml }}
        />
      </section>
    );
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

    // eslint-disable-next-line @next/next/no-img-element
    const imageNode = (
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

  if (section.type === "faq") {
    const items = Array.isArray(props.items) ? (props.items as FaqItem[]) : [];
    if (!items.length) return null;

    return (
      <section key={section.id} className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {title || "FAQ"}
        </h2>
        <dl className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3"
            >
              <dt className="text-sm font-medium text-zinc-900">
                {item.question ?? ""}
              </dt>
              <dd className="mt-1 text-sm text-zinc-600">
                {item.answer ?? ""}
              </dd>
            </div>
          ))}
        </dl>
      </section>
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
