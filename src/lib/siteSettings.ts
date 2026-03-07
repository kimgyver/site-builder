import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PUBLISH_TIME_ZONE,
  normalizePublishTimeZone
} from "@/lib/publishTimeZone";

export type SiteSettings = {
  siteName: string;
  siteTagline: string | null;
  siteUrl: string | null;
  contactEmail: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
  cronPublishIntervalMinutes: number;
  publishTimeZone: string;
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
  publishTimeZone: DEFAULT_PUBLISH_TIME_ZONE,
  disableIndexing: false,
  adminBrandLabel: "Site Builder Admin",
  updatedAt: null
};

export function normalizeCronIntervalMinutes(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SITE_SETTINGS.cronPublishIntervalMinutes;
  }

  return Math.min(60, Math.max(1, parsed));
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

    const publishTimeZoneColumnExistsResult = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND lower(table_name) = lower('SiteSetting')
          AND lower(column_name) = lower('publishTimeZone')
      ) AS "exists"
    `;

    const hasPublishTimeZoneColumn = Boolean(
      publishTimeZoneColumnExistsResult[0]?.exists
    );

    if (!hasPublishTimeZoneColumn) {
      const legacyRows = await prisma.$queryRaw<
        Array<{
          siteName: string;
          siteTagline: string | null;
          siteUrl: string | null;
          contactEmail: string | null;
          defaultSeoTitle: string | null;
          defaultSeoDescription: string | null;
          cronPublishIntervalMinutes: number;
          disableIndexing: boolean;
          adminBrandLabel: string;
          updatedAt: Date;
        }>
      >`
        SELECT
          "siteName",
          "siteTagline",
          "siteUrl",
          "contactEmail",
          "defaultSeoTitle",
          "defaultSeoDescription",
          "cronPublishIntervalMinutes",
          "disableIndexing",
          "adminBrandLabel",
          "updatedAt"
        FROM "SiteSetting"
        WHERE "key" = 'default'
        LIMIT 1
      `;

      const legacyRow = legacyRows[0];
      if (!legacyRow) {
        return DEFAULT_SITE_SETTINGS;
      }

      return {
        siteName: legacyRow.siteName,
        siteTagline: legacyRow.siteTagline,
        siteUrl: legacyRow.siteUrl,
        contactEmail: legacyRow.contactEmail,
        defaultSeoTitle: legacyRow.defaultSeoTitle,
        defaultSeoDescription: legacyRow.defaultSeoDescription,
        cronPublishIntervalMinutes: normalizeCronIntervalMinutes(
          legacyRow.cronPublishIntervalMinutes
        ),
        publishTimeZone: DEFAULT_SITE_SETTINGS.publishTimeZone,
        disableIndexing: legacyRow.disableIndexing,
        adminBrandLabel: legacyRow.adminBrandLabel,
        updatedAt: legacyRow.updatedAt
      };
    }

    const row = await prisma.siteSetting.findUnique({
      where: { key: "default" }
    });

    if (!row) {
      return DEFAULT_SITE_SETTINGS;
    }

    const rowPublishTimeZone = (row as { publishTimeZone?: string | null })
      .publishTimeZone;

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
      publishTimeZone: normalizePublishTimeZone(rowPublishTimeZone),
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
