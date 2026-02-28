import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
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
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit globals
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Location: <span className="font-medium">{group.location}</span>
          </p>
        </div>
        <Link
          href="/admin/globals"
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back
        </Link>
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
