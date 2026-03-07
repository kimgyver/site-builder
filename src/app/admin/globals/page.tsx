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
  const defaultForLocation = await prisma.globalSectionGroup.findFirst({
    where: { location, isDefault: true },
    select: { id: true }
  });
  const group = await prisma.globalSectionGroup.create({
    data: { location, name, isDefault: !defaultForLocation }
  });
  redirect(`/admin/globals/${group.id}`);
}

async function setDefaultGroup(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() as Location;
  const role = await ensureRole("/admin/globals");
  if (!canEditContent(role)) return;
  if (!id || !LOCATIONS.includes(location)) return;

  const target = await prisma.globalSectionGroup.findUnique({
    where: { id },
    select: { id: true, location: true }
  });
  if (!target || target.location !== location) return;

  await prisma.$transaction([
    prisma.globalSectionGroup.updateMany({
      where: { location, isDefault: true },
      data: { isDefault: false }
    }),
    prisma.globalSectionGroup.update({
      where: { id },
      data: { isDefault: true }
    })
  ]);

  redirect("/admin/globals");
}

export default async function GlobalSectionsListPage() {
  await ensureRole("/admin/globals");

  const groups = await prisma.globalSectionGroup.findMany({
    orderBy: [{ location: "asc" }, { createdAt: "asc" }]
  });

  const byLocation = LOCATIONS.reduce<Record<Location, typeof groups>>(
    (acc, location) => {
      acc[location] = groups.filter(group => group.location === location);
      return acc;
    },
    {
      header: [],
      footer: []
    }
  );

  return (
    <div className="mx-auto w-full space-y-6 lg:max-w-4xl">
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
          const locationGroups = byLocation[location];
          return (
            <div
              key={location}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {location === "header" ? "Header" : "Footer"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {locationGroups.length > 0
                      ? `${locationGroups.length} group${locationGroups.length > 1 ? "s" : ""}`
                      : "Not created yet"}
                  </div>
                </div>
                <form
                  action={createGroup}
                  className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                >
                  <input type="hidden" name="location" value={location} />
                  <input
                    name="name"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-56"
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
              </div>

              {locationGroups.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {locationGroups.map(group => (
                    <li
                      key={group.id}
                      className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {group.name}
                          {group.isDefault ? (
                            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              DEFAULT
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/globals/${group.id}`}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                        >
                          Edit
                        </Link>
                        {!group.isDefault ? (
                          <form action={setDefaultGroup}>
                            <input type="hidden" name="id" value={group.id} />
                            <input
                              type="hidden"
                              name="location"
                              value={location}
                            />
                            <button
                              type="submit"
                              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              Set default
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
