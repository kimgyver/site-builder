import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { getSiteSettings } from "@/lib/siteSettings";
import { resolveSiteUrl } from "@/lib/siteUrl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings.siteUrl);

  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, locale: true, updatedAt: true }
  });

  const localeSet = new Set<string>(SUPPORTED_LOCALES);

  return pages
    .filter(page => localeSet.has(page.locale))
    .map(page => ({
      url: `${siteUrl}/${page.locale}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7
    }));
}
