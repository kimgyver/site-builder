import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/siteSettings";
import { resolveSiteUrl } from "@/lib/siteUrl";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const siteUrl = resolveSiteUrl(settings.siteUrl);

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
