import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import type {
  DynamicLocaleSlugParams,
  DynamicSlugSearchParams
} from "@/types/routes";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale
} from "@/lib/i18n";
import {
  getPageBackgroundColor,
  getSectionBrandingConfig,
  getSectionBackgroundStyle,
  getSectionLayoutConfig,
  getSectionNavigationStyle,
  isExternalHref,
  localizeInternalHref,
  renderSections,
  type RenderableSection
} from "@/lib/public/renderSections";

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

async function findPageByLocale({
  slug,
  locale,
  preview
}: {
  slug: string;
  locale: SupportedLocale;
  preview?: string;
}) {
  const where =
    preview && preview.trim()
      ? {
          slug,
          locale,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, locale, status: "PUBLISHED" as const };

  return prisma.page.findFirst({
    where,
    include: { sections: { orderBy: { order: "asc" } } }
  });
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params: DynamicLocaleSlugParams;
  searchParams: DynamicSlugSearchParams;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const { preview } = await searchParams;

  if (!slug) return {};
  if (!isSupportedLocale(rawLocale)) return {};

  const page =
    (await findPageByLocale({ slug, locale: rawLocale, preview })) ??
    (rawLocale !== DEFAULT_LOCALE
      ? await findPageByLocale({ slug, locale: DEFAULT_LOCALE, preview })
      : null);

  if (!page) return {};

  const siteUrl = getSiteUrl();
  const canonicalPath = `/${rawLocale}/${slug}`;
  const canonical = `${siteUrl}${canonicalPath}`;
  const alternatesLanguages = Object.fromEntries(
    SUPPORTED_LOCALES.map(locale => [locale, `${siteUrl}/${locale}/${slug}`])
  ) as Record<string, string>;
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || undefined;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: alternatesLanguages
    },
    openGraph: {
      type: "article",
      locale: rawLocale,
      url: canonical,
      title,
      description
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    robots: preview
      ? { index: false, follow: false }
      : { index: true, follow: true }
  };
}

export default async function LocaleDynamicPage({
  params,
  searchParams
}: {
  params: DynamicLocaleSlugParams;
  searchParams: DynamicSlugSearchParams;
}) {
  const { locale: rawLocale, slug } = await params;
  const { preview } = await searchParams;

  if (!slug || !isSupportedLocale(rawLocale)) {
    notFound();
  }

  const page =
    (await findPageByLocale({ slug, locale: rawLocale, preview })) ??
    (rawLocale !== DEFAULT_LOCALE
      ? await findPageByLocale({ slug, locale: DEFAULT_LOCALE, preview })
      : null);

  if (!page) notFound();

  const localeForLinks = rawLocale;

  const getMenuByLocation = async (location: "header" | "footer") => {
    try {
      return await prisma.menu.findFirst({
        where: { location },
        select: {
          id: true,
          name: true,
          location: true,
          items: {
            orderBy: { order: "asc" },
            select: { id: true, href: true, label: true, openInNewTab: true }
          }
        }
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (
        message.includes("openInNewTab") ||
        message.includes("OpenInNewTab")
      ) {
        return await prisma.menu.findFirst({
          where: { location },
          select: {
            id: true,
            name: true,
            location: true,
            items: {
              orderBy: { order: "asc" },
              select: { id: true, href: true, label: true }
            }
          }
        });
      }
      throw e;
    }
  };

  const [headerMenu, footerMenu, headerGlobals, footerGlobals] =
    await Promise.all([
      getMenuByLocation("header"),
      getMenuByLocation("footer"),
      prisma.globalSectionGroup.findFirst({
        where: { location: "header" },
        include: { sections: { orderBy: { order: "asc" } } }
      }),
      prisma.globalSectionGroup.findFirst({
        where: { location: "footer" },
        include: { sections: { orderBy: { order: "asc" } } }
      })
    ]);

  const pageBackgroundColor = getPageBackgroundColor(
    page.sections as unknown as RenderableSection[]
  );

  const headerGlobalsStyle = headerGlobals?.sections
    ? getSectionBackgroundStyle(
        headerGlobals.sections as unknown as RenderableSection[]
      )
    : undefined;
  const footerGlobalsStyle = footerGlobals?.sections
    ? getSectionBackgroundStyle(
        footerGlobals.sections as unknown as RenderableSection[]
      )
    : undefined;

  const headerNavigationStyle = headerGlobals?.sections
    ? getSectionNavigationStyle(
        headerGlobals.sections as unknown as RenderableSection[]
      )
    : {
        menuTextColor: undefined,
        menuHoverColor: undefined,
        menuFontSizePx: undefined,
        dividerColor: undefined
      };

  const footerNavigationStyle = footerGlobals?.sections
    ? getSectionNavigationStyle(
        footerGlobals.sections as unknown as RenderableSection[]
      )
    : {
        menuTextColor: undefined,
        menuHoverColor: undefined,
        menuFontSizePx: undefined,
        dividerColor: undefined
      };

  const headerBranding = headerGlobals?.sections
    ? getSectionBrandingConfig(
        headerGlobals.sections as unknown as RenderableSection[]
      )
    : {
        brandName: "",
        brandHref: undefined,
        brandLogoUrl: undefined,
        brandLogoHeightPx: 32
      };

  const pageBranding = getSectionBrandingConfig(
    page.sections as unknown as RenderableSection[]
  );
  const pageLayout = getSectionLayoutConfig(
    page.sections as unknown as RenderableSection[]
  );
  const headerLayout = headerGlobals?.sections
    ? getSectionLayoutConfig(
        headerGlobals.sections as unknown as RenderableSection[]
      )
    : pageLayout;
  const footerLayout = footerGlobals?.sections
    ? getSectionLayoutConfig(
        footerGlobals.sections as unknown as RenderableSection[]
      )
    : pageLayout;

  const widthClassByPreset: Record<string, string> = {
    narrow: "max-w-2xl",
    default: "max-w-3xl",
    wide: "max-w-5xl",
    wider: "max-w-6xl",
    full: "max-w-none"
  };

  const mainWidthClass =
    widthClassByPreset[pageLayout.contentWidth] ?? "max-w-3xl";
  const headerWidthClass =
    widthClassByPreset[headerLayout.contentWidth] ?? mainWidthClass;
  const footerWidthClass =
    widthClassByPreset[footerLayout.contentWidth] ?? mainWidthClass;

  const BrandWrapper =
    headerBranding.brandHref && isExternalHref(headerBranding.brandHref)
      ? "a"
      : Link;

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-900"
      style={
        pageBackgroundColor
          ? { backgroundColor: pageBackgroundColor }
          : undefined
      }
    >
      <header
        className="bg-white"
        style={{
          ...(headerGlobalsStyle ?? {}),
          borderBottom: `1px solid ${headerNavigationStyle.dividerColor ?? "#e4e4e7"}`
        }}
      >
        <div
          className={`mx-auto flex items-center justify-between gap-3 px-4 py-4 ${headerWidthClass}`}
        >
          {headerBranding.brandName || headerBranding.brandLogoUrl ? (
            <BrandWrapper
              href={headerBranding.brandHref ?? "/"}
              className="inline-flex min-w-0 items-center gap-2 text-zinc-900"
              {...(BrandWrapper === "a"
                ? {
                    target: "_blank",
                    rel: "noopener noreferrer"
                  }
                : {})}
            >
              {headerBranding.brandLogoUrl ? (
                <span
                  className="relative overflow-hidden rounded"
                  style={{
                    height: `${headerBranding.brandLogoHeightPx}px`,
                    width: `${Math.round(headerBranding.brandLogoHeightPx * 3.5)}px`
                  }}
                >
                  <Image
                    src={headerBranding.brandLogoUrl}
                    alt={headerBranding.brandName || "Site logo"}
                    fill
                    unoptimized
                    sizes={`${Math.round(headerBranding.brandLogoHeightPx * 3.5)}px`}
                    className="object-contain"
                  />
                </span>
              ) : null}
              {headerBranding.brandName ? (
                <span className="truncate text-sm font-semibold tracking-tight">
                  {headerBranding.brandName}
                </span>
              ) : null}
            </BrandWrapper>
          ) : (
            <div />
          )}
          <nav
            className="flex flex-wrap items-center gap-4 text-sm text-zinc-600"
            style={
              {
                color: headerNavigationStyle.menuTextColor,
                fontSize: headerNavigationStyle.menuFontSizePx
                  ? `${headerNavigationStyle.menuFontSizePx}px`
                  : undefined,
                ...(headerNavigationStyle.menuHoverColor
                  ? {
                      "--menu-hover-color": headerNavigationStyle.menuHoverColor
                    }
                  : {})
              } as CSSProperties
            }
          >
            {(headerMenu?.items ?? []).map(
              (item: {
                id: string;
                href: string;
                label: string;
                openInNewTab?: boolean | null;
              }) => {
                const href = localizeInternalHref(item.href, localeForLinks);
                const openInNewTab = item.openInNewTab === true;
                return isExternalHref(href) ? (
                  <a
                    key={item.id}
                    href={href}
                    className="site-menu-link"
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={href}
                    className="site-menu-link"
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              }
            )}
          </nav>
        </div>
        {(headerGlobals?.sections?.length ?? 0) > 0 ? (
          <div className="pb-6 pt-2">
            <div className={`mx-auto px-4 ${headerWidthClass}`}>
              <div
                className="text-zinc-800"
                style={{
                  display: "grid",
                  rowGap: `${headerLayout.sectionGapPx}px`
                }}
              >
                {renderSections(
                  headerGlobals!.sections as unknown as RenderableSection[],
                  page.title
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className={`mx-auto px-4 py-12 ${mainWidthClass}`}>
        {pageBranding.brandName || pageBranding.brandLogoUrl ? (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-sm">
            {pageBranding.brandHref &&
            isExternalHref(pageBranding.brandHref) ? (
              <a
                href={pageBranding.brandHref}
                className="inline-flex min-w-0 items-center gap-2 text-zinc-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                {pageBranding.brandLogoUrl ? (
                  <span
                    className="relative overflow-hidden rounded"
                    style={{
                      height: `${pageBranding.brandLogoHeightPx}px`,
                      width: `${Math.round(pageBranding.brandLogoHeightPx * 3.5)}px`
                    }}
                  >
                    <Image
                      src={pageBranding.brandLogoUrl}
                      alt={pageBranding.brandName || "Page brand logo"}
                      fill
                      unoptimized
                      sizes={`${Math.round(pageBranding.brandLogoHeightPx * 3.5)}px`}
                      className="object-contain"
                    />
                  </span>
                ) : null}
                {pageBranding.brandName ? (
                  <span className="truncate text-base font-semibold tracking-tight">
                    {pageBranding.brandName}
                  </span>
                ) : null}
              </a>
            ) : (
              <Link
                href={pageBranding.brandHref ?? "/"}
                className="inline-flex min-w-0 items-center gap-2 text-zinc-900"
              >
                {pageBranding.brandLogoUrl ? (
                  <span
                    className="relative overflow-hidden rounded"
                    style={{
                      height: `${pageBranding.brandLogoHeightPx}px`,
                      width: `${Math.round(pageBranding.brandLogoHeightPx * 3.5)}px`
                    }}
                  >
                    <Image
                      src={pageBranding.brandLogoUrl}
                      alt={pageBranding.brandName || "Page brand logo"}
                      fill
                      unoptimized
                      sizes={`${Math.round(pageBranding.brandLogoHeightPx * 3.5)}px`}
                      className="object-contain"
                    />
                  </span>
                ) : null}
                {pageBranding.brandName ? (
                  <span className="truncate text-base font-semibold tracking-tight">
                    {pageBranding.brandName}
                  </span>
                ) : null}
              </Link>
            )}
          </div>
        ) : null}
        {pageLayout.showPageTitle ? (
          <h1 className="text-3xl font-semibold tracking-tight">
            {page.title}
          </h1>
        ) : null}
        <div
          className="text-zinc-800"
          style={{
            marginTop: pageLayout.showPageTitle ? "1.5rem" : "0",
            display: "grid",
            rowGap: `${pageLayout.sectionGapPx}px`
          }}
        >
          {renderSections(
            page.sections as unknown as RenderableSection[],
            page.title
          )}
        </div>
      </main>

      <footer
        className="bg-white"
        style={{
          ...(footerGlobalsStyle ?? {}),
          borderTop: `1px solid ${footerNavigationStyle.dividerColor ?? "#e4e4e7"}`
        }}
      >
        {(footerGlobals?.sections?.length ?? 0) > 0 ? (
          <div className="py-8">
            <div className={`mx-auto px-4 ${footerWidthClass}`}>
              <div
                className="text-zinc-800"
                style={{
                  display: "grid",
                  rowGap: `${footerLayout.sectionGapPx}px`
                }}
              >
                {renderSections(
                  footerGlobals!.sections as unknown as RenderableSection[],
                  page.title
                )}
              </div>
            </div>
          </div>
        ) : null}
        {(footerMenu?.items?.length ?? 0) > 0 ? (
          <div className={`mx-auto px-4 py-6 ${footerWidthClass}`}>
            <nav
              className="flex flex-wrap items-center gap-4 text-sm text-zinc-600"
              style={
                {
                  color: footerNavigationStyle.menuTextColor,
                  fontSize: footerNavigationStyle.menuFontSizePx
                    ? `${footerNavigationStyle.menuFontSizePx}px`
                    : undefined,
                  ...(footerNavigationStyle.menuHoverColor
                    ? {
                        "--menu-hover-color":
                          footerNavigationStyle.menuHoverColor
                      }
                    : {})
                } as CSSProperties
              }
            >
              {footerMenu!.items.map(
                (item: {
                  id: string;
                  href: string;
                  label: string;
                  openInNewTab?: boolean | null;
                }) => {
                  const href = localizeInternalHref(item.href, localeForLinks);
                  const openInNewTab = item.openInNewTab === true;
                  return isExternalHref(href) ? (
                    <a
                      key={item.id}
                      href={href}
                      className="site-menu-link"
                      target={openInNewTab ? "_blank" : undefined}
                      rel={openInNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={href}
                      className="site-menu-link"
                      target={openInNewTab ? "_blank" : undefined}
                      rel={openInNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                }
              )}
            </nav>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
