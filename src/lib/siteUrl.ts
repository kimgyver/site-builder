export function resolveSiteUrl(configuredSiteUrl?: string | null) {
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
