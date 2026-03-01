import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/siteSettings";

function getSiteUrl(configuredSiteUrl: string | null) {
  if (configuredSiteUrl?.trim()) {
    return configuredSiteUrl.replace(/\/$/, "");
  }

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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const siteUrl = getSiteUrl(settings.siteUrl);

  if (settings.disableIndexing) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/"
        }
      ],
      sitemap: `${siteUrl}/sitemap.xml`
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
