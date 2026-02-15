import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import type { FaqItem, SectionProps } from "@/types/sections";
import type {
  DynamicSlugParams,
  DynamicSlugSearchParams
} from "@/types/routes";

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
    // Accept more Google Maps embed host variations
    if (
      !host.includes("google.com") &&
      !host.includes("maps.google.com") &&
      !host.includes("maps.app.goo.gl")
    ) {
      return null;
    }
    // Direct embed URL
    if (url.pathname.includes("/maps/embed")) {
      return url.toString();
    }
    // pb param: force embed
    const pb = url.searchParams.get("pb");
    if (pb) {
      return `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
    }
    // q param: fallback embed
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
    // No valid embed
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params: DynamicSlugParams;
  searchParams: DynamicSlugSearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (!slug) return {};

  const where =
    preview && preview.trim()
      ? {
          slug,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, status: "PUBLISHED" as const };

  const page = await prisma.page.findFirst({
    where,
    select: { title: true, seoTitle: true, seoDescription: true }
  });

  if (!page) return {};

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
    robots: preview ? { index: false, follow: false } : undefined
  };
}

export default async function DynamicPage({
  params,
  searchParams
}: {
  params: DynamicSlugParams;
  searchParams: DynamicSlugSearchParams;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (!slug) {
    notFound();
  }

  const where =
    preview && preview.trim()
      ? {
          slug,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, status: "PUBLISHED" as const };

  const page = await prisma.page.findFirst({
    where,
    include: { sections: { orderBy: { order: "asc" } } }
  });

  if (!page) {
    notFound();
  }

  const pageStyleSection = page.sections.find(
    section => section.enabled !== false && section.type === "pageStyle"
  );
  const pageStyleProps = (pageStyleSection?.props ?? {}) as SectionProps;
  const pageBackgroundColor = getSafeColor(pageStyleProps.backgroundColor);

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-900"
      style={
        pageBackgroundColor
          ? { backgroundColor: pageBackgroundColor }
          : undefined
      }
    >
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        <div className="mt-6 space-y-8 text-zinc-800">
          {page.sections
            .filter(section => section.enabled !== false)
            .map(section => {
              const props = section.props as SectionProps;

              if (section.type === "pageStyle") {
                return null;
              }

              const title =
                typeof props.title === "string" ? props.title : undefined;
              const subtitle =
                typeof props.subtitle === "string" ? props.subtitle : undefined;
              const html = typeof props.html === "string" ? props.html : "";
              const imageUrl =
                typeof props.url === "string" ? props.url : undefined;
              const imageAlt = typeof props.alt === "string" ? props.alt : "";
              const imageHref =
                typeof props.href === "string" && props.href.trim()
                  ? props.href.trim()
                  : undefined;
              const imageCaption =
                typeof props.caption === "string" ? props.caption : undefined;

              if (section.type === "hero") {
                const heroBackgroundColor = getSafeColor(props.backgroundColor);
                const heroTextColor = getSafeColor(props.textColor);
                const heroSubtitleColor = getSafeColor(props.subtitleColor);

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
                      {title || page.title}
                    </h2>
                    {subtitle ? (
                      <p
                        className="mt-3 max-w-prose text-sm text-zinc-300"
                        style={
                          heroSubtitleColor
                            ? { color: heroSubtitleColor }
                            : undefined
                        }
                      >
                        {subtitle}
                      </p>
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

              if (section.type === "richText" || section.type === "text") {
                return (
                  <div
                    key={section.id}
                    className="rich-content max-w-none"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              }

              if (section.type === "image") {
                if (!imageUrl) return null;
                // 유튜브/구글맵 링크 자동 embed 렌더링
                const isYouTube =
                  (typeof imageUrl === "string" &&
                    imageUrl.includes("youtube.com")) ||
                  (typeof imageUrl === "string" &&
                    imageUrl.includes("youtu.be"));
                const isGoogleMaps =
                  typeof imageUrl === "string" &&
                  (imageUrl.includes("maps.google.com") ||
                    imageUrl.startsWith(
                      "https://www.google.com/maps/embed?pb="
                    ));
                if (isYouTube || isGoogleMaps) {
                  const provider = isGoogleMaps ? "maps" : "youtube";
                  const src =
                    provider === "maps"
                      ? getMapsEmbedSrc(imageUrl)
                      : getYouTubeEmbedSrc(imageUrl);
                  if (!src) return null;
                  const embedTitle = isGoogleMaps
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
                // 일반 이미지 렌더링
                const imageNode = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={imageAlt}
                    className="w-full rounded-lg border border-zinc-200 object-cover"
                  />
                );
                return (
                  <figure key={section.id} className="space-y-2">
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
                const items = Array.isArray(props.items)
                  ? (props.items as FaqItem[])
                  : [];
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
                const items = Array.isArray(props.items)
                  ? (props.items as FaqItem[])
                  : [];
                if (!items.length) return null;

                return (
                  <section key={section.id} className="space-y-2">
                    {title ? (
                      <h2 className="text-xl font-semibold tracking-tight">
                        {title}
                      </h2>
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
            })}
        </div>
      </main>
    </div>
  );
}
