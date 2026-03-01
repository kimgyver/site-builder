import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import { DEFAULT_SITE_SETTINGS, getSiteSettings } from "@/lib/siteSettings";

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
  const disableIndexing = formData.get("disableIndexing") === "on";
  const siteUrl = normalizeSiteUrl(toOptionalString(formData, "siteUrl"));

  await prisma.siteSetting.upsert({
    where: { key: "default" },
    update: {
      siteName,
      siteTagline,
      siteUrl,
      contactEmail,
      defaultSeoTitle,
      defaultSeoDescription,
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
      disableIndexing,
      adminBrandLabel
    }
  });

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

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Site-wide options inspired by common CMS settings
          (general/reading/SEO).
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
