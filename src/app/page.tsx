import Link from "next/link";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function Home() {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {`Welcome to ${settings.siteName}`}
        </h1>
        <p className="text-sm text-zinc-600">
          {settings.siteTagline ||
            "Use the admin to manage pages, menus, and global sections. Start from Page Management to create and edit page content."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/pages"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open Page Management
          </Link>
        </div>
      </main>
    </div>
  );
}
