import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/adminAuth";

async function logout() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin/pages" className="font-semibold tracking-tight">
            Site Builder Admin
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-600">
            <Link href="/admin/pages" className="hover:text-zinc-900">
              Page Management
            </Link>
            <Link href="/admin/menus" className="hover:text-zinc-900">
              Menus
            </Link>
            <Link href="/admin/globals" className="hover:text-zinc-900">
              Globals
            </Link>
            <form action={logout}>
              <button type="submit" className="hover:text-zinc-900">
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
