import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

export default async function AdminHome() {
  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);

  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create and manage the pages of your site.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Role: {role ?? "guest"}
            {role === "editor" ? " (cannot publish/delete)" : ""}
          </p>
        </div>
        <Link
          href="/admin/pages/new"
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 w-full sm:w-auto"
        >
          New page
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2 bg-white border-l border-zinc-200" style={{ position: 'sticky', right: 0, zIndex: 2 }}> </th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No pages yet. Create your first page.
                </td>
              </tr>
            ) : (
              pages.map(page => (
                <tr key={page.id} className="border-t hover:bg-zinc-50">
                  <td className="px-4 py-2 text-sm font-medium text-zinc-900">
                    {page.title}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-600">
                    /{page.slug}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize text-zinc-700">
                    {page.status.toLowerCase()}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-600">
                    {page.updatedAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs bg-white border-l border-zinc-200" style={{ position: 'sticky', right: 0, zIndex: 1 }}>
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 w-full sm:w-auto block text-center flex items-center justify-center gap-1"
                      aria-label="Edit page"
                      style={{ minWidth: "64px", overflow: "visible" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline-block"><path d="M15.414 2.586a2 2 0 0 1 2.828 2.828l-10 10A2 2 0 0 1 7 16H5a1 1 0 0 1-1-1v-2a2 2 0 0 1 .586-1.414l10-10z" /></svg>
                      <span>Edit</span>
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
