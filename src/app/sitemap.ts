import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

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
