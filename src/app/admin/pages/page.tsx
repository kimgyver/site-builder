import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/siteSettings";
import { formatDateTimeLocalInTimeZone } from "@/lib/publishTimeZone";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  canPublishContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

export default async function PagesListPage() {
  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);

  const canCreatePage = role ? canEditContent(role) : false;
  const settings = await getSiteSettings();
  const now = new Date();

  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:max-w-4xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Page Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create and manage the pages of your site.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Role: {role ?? "guest"}
            {role && !canPublishContent(role) ? " (cannot publish/delete)" : ""}
          </p>
        </div>
        {canCreatePage ? (
          <Link
            href="/admin/pages/new"
            className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 sm:w-auto"
          >
            New page
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="hidden px-4 py-2 md:table-cell">Locale</th>
              <th className="px-4 py-2">Slug</th>
              <th className="hidden px-4 py-2 md:table-cell">Status</th>
              <th className="hidden px-4 py-2 md:table-cell">
                Publish schedule
              </th>
              <th className="hidden px-4 py-2 md:table-cell">Updated</th>
              <th
                className="border-l border-zinc-200 bg-white px-4 py-2"
                style={{ position: "sticky", right: 0, zIndex: 2 }}
              >
                {" "}
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No pages yet. Create your first page.
                </td>
              </tr>
            ) : (
              pages.map(page => (
                <tr key={page.id} className="border-t hover:bg-zinc-50">
                  <td className="px-4 py-2 text-sm font-medium text-zinc-900">
                    <div className="space-y-1">
                      <div>{page.title}</div>
                      <div className="space-y-0.5 text-[11px] font-normal text-zinc-500 md:hidden">
                        <div>Locale: {page.locale}</div>
                        <div>Status: {page.status.toLowerCase()}</div>
                        <div>
                          Schedule:{" "}
                          {page.status === "PUBLISHED"
                            ? "—"
                            : !page.publishAt
                              ? "Not scheduled"
                              : page.publishAt <= now
                                ? "Due"
                                : formatDateTimeLocalInTimeZone(
                                    page.publishAt,
                                    settings.publishTimeZone
                                  ).replace("T", " ")}
                        </div>
                        <div>Updated: {page.updatedAt.toLocaleString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-xs text-zinc-600 md:table-cell">
                    {page.locale}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-600">
                    /{page.locale}/{page.slug}
                  </td>
                  <td className="hidden px-4 py-2 text-xs capitalize text-zinc-700 md:table-cell">
                    {page.status.toLowerCase()}
                  </td>
                  <td className="hidden px-4 py-2 text-xs text-zinc-600 md:table-cell">
                    {page.status === "PUBLISHED" ? (
                      <span className="text-zinc-500">—</span>
                    ) : !page.publishAt ? (
                      <span className="rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
                        Not scheduled
                      </span>
                    ) : page.publishAt <= now ? (
                      <span
                        className="rounded bg-amber-100 px-2 py-1 text-[11px] text-amber-800"
                        title={`Scheduled at ${formatDateTimeLocalInTimeZone(page.publishAt, settings.publishTimeZone).replace("T", " ")} (${settings.publishTimeZone})`}
                      >
                        Due
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] text-emerald-800">
                        Scheduled ·{" "}
                        {formatDateTimeLocalInTimeZone(
                          page.publishAt,
                          settings.publishTimeZone
                        ).replace("T", " ")}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-2 text-xs text-zinc-600 md:table-cell">
                    {page.updatedAt.toLocaleString()}
                  </td>
                  <td
                    className="border-l border-zinc-200 bg-white px-4 py-2 text-xs"
                    style={{ position: "sticky", right: 0, zIndex: 1 }}
                  >
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="block w-full rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100 sm:w-auto"
                      aria-label="Edit page"
                      style={{ minWidth: "64px", overflow: "visible" }}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
