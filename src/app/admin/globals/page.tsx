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

const LOCATIONS = ["header", "footer"] as const;
type Location = (typeof LOCATIONS)[number];

async function createGroup(formData: FormData) {
  "use server";
  const location = String(formData.get("location") ?? "").trim() as Location;
  const name = String(formData.get("name") ?? "").trim();
  const role = await ensureRole("/admin/globals");
  if (!canEditContent(role)) return;
  if (!LOCATIONS.includes(location)) return;
  if (!name) return;
  const group = await prisma.globalSectionGroup.create({
    data: { location, name }
  });
  redirect(`/admin/globals/${group.id}`);
}

export default async function GlobalSectionsListPage() {
  await ensureRole("/admin/globals");

  const groups = await prisma.globalSectionGroup.findMany();
  const byLocation = new Map(groups.map(g => [g.location, g]));

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Shared Header/Footer Blocks
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage reusable section groups for header and footer areas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {LOCATIONS.map(location => {
          const group = byLocation.get(location);
          return (
            <div
              key={location}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {location === "header" ? "Header" : "Footer"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {group ? `Group ID: ${group.id}` : "Not created yet"}
                  </div>
                </div>

                {group ? (
                  <Link
                    href={`/admin/globals/${group.id}`}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                  >
                    Edit
                  </Link>
                ) : (
                  <form action={createGroup}>
                    <input type="hidden" name="location" value={location} />
                    <input
                      name="name"
                      className="mr-2 w-40 rounded-md border border-zinc-300 px-2 py-1 text-xs"
                      placeholder={`${location} global sections`}
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
