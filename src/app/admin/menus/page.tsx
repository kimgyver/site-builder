import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

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

async function createMenu(formData: FormData) {
  "use server";
  const role = await ensureRole("/admin/menus");
  if (!canEditContent(role)) return;
  const location = String(formData.get("location") ?? "header").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.menu.create({
    data: {
      location,
      name
    }
  });
}

export default async function MenuManagementAdmin() {
  await ensureRole("/admin/menus");
  const menus = await prisma.menu.findMany({
    orderBy: { location: "asc" }
  });
  const byLocation = new Map(menus.map(m => [m.location, m] as const));

  const locations = ["header", "footer"] as const;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Menu Management
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage navigation links shown in the header and footer.
        </p>
      </div>

      <div className="space-y-3">
        {locations.map(location => {
          const menu = byLocation.get(location);
          return (
            <div
              key={location}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {location === "header"
                      ? "Header navigation"
                      : "Footer navigation"}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {menu ? menu.name : "No menu yet"}
                  </div>
                </div>
                {menu ? (
                  <Link
                    href={`/admin/menus/${menu.id}`}
                    className="rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Edit
                  </Link>
                ) : (
                  <form action={createMenu} className="flex items-center gap-2">
                    <input type="hidden" name="location" value={location} />
                    <input
                      name="name"
                      className="w-40 rounded-md border border-zinc-300 px-2 py-1 text-xs"
                      placeholder={`${location} menu`}
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Create
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
