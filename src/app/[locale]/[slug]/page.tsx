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
    : { brandName: "", brandHref: undefined, brandLogoUrl: undefined };

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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 gap-3">
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
                <span className="relative h-7 w-7 overflow-hidden rounded">
                  <Image
                    src={headerBranding.brandLogoUrl}
                    alt={headerBranding.brandName || "Site logo"}
                    fill
                    unoptimized
                    sizes="28px"
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
            <div className="mx-auto max-w-3xl px-4">
              <div className="space-y-8 text-zinc-800">
                {renderSections(
                  headerGlobals!.sections as unknown as RenderableSection[],
                  page.title
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        <div className="mt-6 space-y-8 text-zinc-800">
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
            <div className="mx-auto max-w-3xl px-4">
              <div className="space-y-8 text-zinc-800">
                {renderSections(
                  footerGlobals!.sections as unknown as RenderableSection[],
                  page.title
                )}
              </div>
            </div>
          </div>
        ) : null}
        {(footerMenu?.items?.length ?? 0) > 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-6">
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
