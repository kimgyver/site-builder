import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/adminAuth";
import { getSiteSettings } from "@/lib/siteSettings";

function SettingsGearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10.325 4.317a1 1 0 0 1 1.35-.936l.648.247a1 1 0 0 0 1.354-.648l.247-.648a1 1 0 0 1 1.873 0l.247.648a1 1 0 0 0 1.354.648l.648-.247a1 1 0 0 1 1.35.936l.093.689a1 1 0 0 0 1.133.853l.689-.093a1 1 0 0 1 .936 1.35l-.247.648a1 1 0 0 0 .648 1.354l.648.247a1 1 0 0 1 0 1.873l-.648.247a1 1 0 0 0-.648 1.354l.247.648a1 1 0 0 1-.936 1.35l-.689-.093a1 1 0 0 0-1.133.853l-.093.689a1 1 0 0 1-1.35.936l-.648-.247a1 1 0 0 0-1.354.648l-.247.648a1 1 0 0 1-1.873 0l-.247-.648a1 1 0 0 0-1.354-.648l-.648.247a1 1 0 0 1-1.35-.936l-.093-.689a1 1 0 0 0-1.133-.853l-.689.093a1 1 0 0 1-.936-1.35l.247-.648a1 1 0 0 0-.648-1.354l-.648-.247a1 1 0 0 1 0-1.873l.648-.247a1 1 0 0 0 .648-1.354l-.247-.648a1 1 0 0 1 .936-1.35l.689.093a1 1 0 0 0 1.133-.853l.093-.689Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

async function logout() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export default async function AdminLayout({
  children
}: {
  children: ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <div className="admin-shell min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/pages" className="font-semibold tracking-tight">
            {settings.adminBrandLabel}
          </Link>
          <nav className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 sm:w-auto">
            <Link
              href="/admin/pages"
              className="whitespace-nowrap hover:text-zinc-900"
            >
              Page Management
            </Link>
            <Link
              href="/admin/menus"
              className="whitespace-nowrap hover:text-zinc-900"
            >
              Menu Management
            </Link>
            <Link
              href="/admin/globals"
              className="whitespace-nowrap hover:text-zinc-900"
            >
              Global Sections
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <SettingsGearIcon className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="whitespace-nowrap hover:text-zinc-900"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
