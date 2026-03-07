import { prisma } from "@/lib/prisma";

export type SiteSettings = {
  siteName: string;
  siteTagline: string | null;
  siteUrl: string | null;
  contactEmail: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
  cronPublishIntervalMinutes: number;
  disableIndexing: boolean;
  adminBrandLabel: string;
  updatedAt: Date | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Site Builder",
  siteTagline: null,
  siteUrl: null,
  contactEmail: null,
  defaultSeoTitle: null,
  defaultSeoDescription: null,
  cronPublishIntervalMinutes: 5,
  disableIndexing: false,
  adminBrandLabel: "Site Builder Admin",
  updatedAt: null
};

export const ALLOWED_CRON_INTERVAL_MINUTES = [5, 10, 15, 30, 60] as const;

export function normalizeCronIntervalMinutes(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SITE_SETTINGS.cronPublishIntervalMinutes;
  }

  if (
    ALLOWED_CRON_INTERVAL_MINUTES.includes(
      parsed as (typeof ALLOWED_CRON_INTERVAL_MINUTES)[number]
    )
  ) {
    return parsed;
  }

  return DEFAULT_SITE_SETTINGS.cronPublishIntervalMinutes;
}

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("SiteSetting") ||
    message.includes('relation "SiteSetting" does not exist') ||
    message.includes("does not exist")
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const tableExistsResult = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'SiteSetting'
      ) AS "exists"
    `;

    if (!tableExistsResult[0]?.exists) {
      return DEFAULT_SITE_SETTINGS;
    }

    const row = await prisma.siteSetting.findUnique({
      where: { key: "default" }
    });

    if (!row) {
      return DEFAULT_SITE_SETTINGS;
    }

    return {
      siteName: row.siteName,
      siteTagline: row.siteTagline,
      siteUrl: row.siteUrl,
      contactEmail: row.contactEmail,
      defaultSeoTitle: row.defaultSeoTitle,
      defaultSeoDescription: row.defaultSeoDescription,
      cronPublishIntervalMinutes: normalizeCronIntervalMinutes(
        row.cronPublishIntervalMinutes
      ),
      disableIndexing: row.disableIndexing,
      adminBrandLabel: row.adminBrandLabel,
      updatedAt: row.updatedAt
    };
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error("Failed to load site settings", error);
    }
    return DEFAULT_SITE_SETTINGS;
  }
}
