import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import GlobalGroupEditorClient from "@/components/admin/GlobalGroupEditorClient";

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

type DraftSection = {
  type: string;
  enabled: boolean;
  props: unknown;
};

async function getGroup(id: string) {
  const group = await prisma.globalSectionGroup.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } }
  });
  if (!group) notFound();
  return group;
}

async function setDefaultGroup(formData: FormData) {
  "use server";
  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) return;

  const role = await ensureRole(`/admin/globals/${groupId}`);
  if (!canEditContent(role)) return;

  const target = await prisma.globalSectionGroup.findUnique({
    where: { id: groupId },
    select: { id: true, location: true }
  });
  if (!target) return;

  await prisma.$transaction([
    prisma.globalSectionGroup.updateMany({
      where: { location: target.location, isDefault: true },
      data: { isDefault: false }
    }),
    prisma.globalSectionGroup.update({
      where: { id: target.id },
      data: { isDefault: true }
    })
  ]);

  redirect(`/admin/globals/${groupId}`);
}

export default async function GlobalGroupEditPage({
  params
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();
  await ensureRole(`/admin/globals/${id}`);
  const group = await getGroup(id);

  return (
    <div className="mx-auto w-full space-y-6 lg:max-w-4xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Shared Blocks
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Area: <span className="font-medium">{group.location}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {group.isDefault
              ? "This group is the default for pages without a specific override."
              : "Pages use this group only when explicitly selected."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {!group.isDefault ? (
            <form action={setDefaultGroup}>
              <input type="hidden" name="groupId" value={group.id} />
              <button
                type="submit"
                className="w-full rounded-md border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 sm:w-auto"
              >
                Set as default
              </button>
            </form>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:w-auto">
              Default group
            </span>
          )}
          <Link
            href="/admin/globals"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 sm:w-auto"
          >
            Back
          </Link>
        </div>
      </div>

      <GlobalGroupEditorClient
        groupId={group.id}
        location={group.location}
        initialName={group.name}
        initialUpdatedAt={group.updatedAt.toISOString()}
        initialSections={group.sections.map(
          (section: DraftSection & { id: string; order: number }) => ({
            id: section.id,
            type: section.type,
            order: section.order,
            enabled: section.enabled,
            props:
              section.props && typeof section.props === "object"
                ? (section.props as Record<string, unknown>)
                : {}
          })
        )}
      />
    </div>
  );
}
