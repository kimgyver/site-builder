import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import {
  DEFAULT_SITE_SETTINGS,
  getSiteSettings,
  normalizeCronIntervalMinutes
} from "@/lib/siteSettings";
import {
  COMMON_PUBLISH_TIME_ZONES,
  normalizePublishTimeZone
} from "@/lib/publishTimeZone";

async function ensureRole(nextPath: string) {
  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);
  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return role;
}

function toOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function normalizeSiteUrl(value: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const withProtocol = /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function saveSettings(formData: FormData) {
  "use server";

  const role = await ensureRole("/admin/settings");
  if (!canEditContent(role)) {
    redirect("/admin/settings");
  }

  const siteName =
    String(formData.get("siteName") ?? "").trim() ||
    DEFAULT_SITE_SETTINGS.siteName;

  const siteTagline = toOptionalString(formData, "siteTagline");
  const contactEmail = toOptionalString(formData, "contactEmail");
  const defaultSeoTitle = toOptionalString(formData, "defaultSeoTitle");
  const defaultSeoDescription = toOptionalString(
    formData,
    "defaultSeoDescription"
  );
  const adminBrandLabel =
    String(formData.get("adminBrandLabel") ?? "").trim() ||
    DEFAULT_SITE_SETTINGS.adminBrandLabel;
  const cronPublishIntervalMinutes = normalizeCronIntervalMinutes(
    formData.get("cronPublishIntervalMinutes")
  );
  const publishTimeZone = normalizePublishTimeZone(
    formData.get("publishTimeZone")
  );
  const disableIndexing = formData.get("disableIndexing") === "on";
  const siteUrl = normalizeSiteUrl(toOptionalString(formData, "siteUrl"));

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

  let hasPublishTimeZoneColumn = Boolean(
    publishTimeZoneColumnExistsResult[0]?.exists
  );

  if (!hasPublishTimeZoneColumn) {
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSetting"
        ADD COLUMN IF NOT EXISTS "publishTimeZone" TEXT NOT NULL DEFAULT 'UTC'
      `;
      hasPublishTimeZoneColumn = true;
    } catch {
      hasPublishTimeZoneColumn = false;
    }
  }

  if (hasPublishTimeZoneColumn) {
    await prisma.siteSetting.upsert({
      where: { key: "default" },
      update: {
        siteName,
        siteTagline,
        siteUrl,
        contactEmail,
        defaultSeoTitle,
        defaultSeoDescription,
        cronPublishIntervalMinutes,
        disableIndexing,
        adminBrandLabel
      },
      create: {
        key: "default",
        siteName,
        siteTagline,
        siteUrl,
        contactEmail,
        defaultSeoTitle,
        defaultSeoDescription,
        cronPublishIntervalMinutes,
        disableIndexing,
        adminBrandLabel
      }
    });

    await prisma.$executeRaw`
      UPDATE "SiteSetting"
      SET "publishTimeZone" = ${publishTimeZone}
      WHERE "key" = 'default'
    `;
  } else {
    const fallbackId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "SiteSetting" (
        "id",
        "key",
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
      )
      VALUES (
        ${fallbackId},
        'default',
        ${siteName},
        ${siteTagline},
        ${siteUrl},
        ${contactEmail},
        ${defaultSeoTitle},
        ${defaultSeoDescription},
        ${cronPublishIntervalMinutes},
        ${disableIndexing},
        ${adminBrandLabel},
        NOW()
      )
      ON CONFLICT ("key") DO UPDATE SET
        "siteName" = EXCLUDED."siteName",
        "siteTagline" = EXCLUDED."siteTagline",
        "siteUrl" = EXCLUDED."siteUrl",
        "contactEmail" = EXCLUDED."contactEmail",
        "defaultSeoTitle" = EXCLUDED."defaultSeoTitle",
        "defaultSeoDescription" = EXCLUDED."defaultSeoDescription",
        "cronPublishIntervalMinutes" = EXCLUDED."cronPublishIntervalMinutes",
        "disableIndexing" = EXCLUDED."disableIndexing",
        "adminBrandLabel" = EXCLUDED."adminBrandLabel",
        "updatedAt" = NOW()
    `;
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");

  redirect("/admin/settings?saved=1");
}

export default async function SettingsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const role = await ensureRole("/admin/settings");
  const settings = await getSiteSettings();
  const canEdit = canEditContent(role);
  const { saved } = await searchParams;
  const publishTimeZoneOptions = COMMON_PUBLISH_TIME_ZONES.includes(
    settings.publishTimeZone as (typeof COMMON_PUBLISH_TIME_ZONES)[number]
  )
    ? [...COMMON_PUBLISH_TIME_ZONES]
    : [settings.publishTimeZone, ...COMMON_PUBLISH_TIME_ZONES];

  return (
    <div className="mx-auto w-full space-y-6 lg:max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Site-wide options inspired by common CMS settings
          (general/reading/SEO).
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Canonical site URL is used for page metadata, robots, and sitemap
          generation.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Role: {role}
          {!canEdit ? " (read-only)" : ""}
        </p>
      </div>

      {saved === "1" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Settings saved.
        </div>
      ) : null}

      <form
        action={saveSettings}
        className="space-y-5 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Site name</span>
            <input
              name="siteName"
              defaultValue={settings.siteName}
              required
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Admin brand label</span>
            <input
              name="adminBrandLabel"
              defaultValue={settings.adminBrandLabel}
              required
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-zinc-700">Site tagline</span>
            <input
              name="siteTagline"
              defaultValue={settings.siteTagline ?? ""}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Contact email</span>
            <input
              type="email"
              name="contactEmail"
              defaultValue={settings.contactEmail ?? ""}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Canonical site URL</span>
            <input
              name="siteUrl"
              placeholder="https://example.com"
              defaultValue={settings.siteUrl ?? ""}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Default SEO title</span>
            <input
              name="defaultSeoTitle"
              defaultValue={settings.defaultSeoTitle ?? ""}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Default SEO description</span>
            <input
              name="defaultSeoDescription"
              defaultValue={settings.defaultSeoDescription ?? ""}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">
              Publish scheduler interval (minutes)
            </span>
            <input
              type="number"
              name="cronPublishIntervalMinutes"
              min={1}
              max={60}
              defaultValue={settings.cronPublishIntervalMinutes}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <span className="text-xs text-zinc-500">
              External scheduler (QStash recommended) should call cron every
              minute. This value controls actual publish interval.
            </span>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-700">Publish timezone (IANA)</span>
            <select
              name="publishTimeZone"
              defaultValue={settings.publishTimeZone}
              disabled={!canEdit}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {publishTimeZoneOptions.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">
              Select the timezone used to interpret scheduled publish datetime.
            </span>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="disableIndexing"
            defaultChecked={settings.disableIndexing}
            disabled={!canEdit}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Disable search indexing (set robots to disallow all)
        </label>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">
            Last updated:{" "}
            {settings.updatedAt
              ? settings.updatedAt.toLocaleString()
              : "not configured"}
          </span>
          {canEdit ? (
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Save settings
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
