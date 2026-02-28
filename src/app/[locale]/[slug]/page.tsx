import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
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
  getSectionBackgroundStyle,
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

  const [headerMenu, footerMenu, headerGlobals, footerGlobals] =
    await Promise.all([
      prisma.menu.findFirst({
        where: { location: "header" },
        include: { items: { orderBy: { order: "asc" } } }
      }),
      prisma.menu.findFirst({
        where: { location: "footer" },
        include: { items: { orderBy: { order: "asc" } } }
      }),
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

  return (
    <div
      className="min-h-screen bg-zinc-50 text-zinc-900"
      style={
        pageBackgroundColor
          ? { backgroundColor: pageBackgroundColor }
          : undefined
      }
    >
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Home
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
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
                    className="hover:text-zinc-900"
                    target={openInNewTab ? "_blank" : undefined}
                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={href}
                    className="hover:text-zinc-900"
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
          <div className="pb-6 pt-2" style={headerGlobalsStyle}>
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

      <footer className="border-t bg-white">
        {(footerGlobals?.sections?.length ?? 0) > 0 ? (
          <div className="py-8" style={footerGlobalsStyle}>
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
            <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
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
                      className="hover:text-zinc-900"
                      target={openInNewTab ? "_blank" : undefined}
                      rel={openInNewTab ? "noopener noreferrer" : undefined}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={href}
                      className="hover:text-zinc-900"
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
