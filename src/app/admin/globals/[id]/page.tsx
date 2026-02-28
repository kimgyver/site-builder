import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  canEditContent,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import { use } from "react";

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

function safeJsonParse(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { __invalid_json: raw };
  }
}

function parseDraft(raw: string): DraftSection[] {
  const lines = raw
    .split("\n")
    .map(l => l.trimEnd())
    .filter(l => l.trim().length > 0);
  const out: DraftSection[] = [];
  for (const line of lines) {
    // Format: [+|-]type::json
    const enabled = !line.startsWith("-");
    const normalized =
      line.startsWith("+") || line.startsWith("-") ? line.slice(1) : line;
    const [typeRaw, jsonRaw] = normalized.split("::");
    const type = (typeRaw ?? "").trim();
    const props = safeJsonParse(String(jsonRaw ?? "").trim());
    if (!type) continue;
    out.push({ type, enabled, props });
  }
  return out;
}

async function saveGlobals(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const role = await ensureRole(`/admin/globals/${id}`);
  if (!canEditContent(role)) return;
  if (!id) return;

  const expectedUpdatedAt = String(
    formData.get("expectedUpdatedAt") ?? ""
  ).trim();
  if (!expectedUpdatedAt) {
    redirect(`/admin/globals/${id}?conflict=1`);
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const draft = String(formData.get("draft") ?? "");
  const nextSections = parseDraft(draft);

  const current = await prisma.globalSectionGroup.findUnique({
    where: { id },
    select: { updatedAt: true }
  });
  if (!current) notFound();
  const currentIso = current.updatedAt.toISOString();
  if (currentIso !== expectedUpdatedAt) {
    redirect(`/admin/globals/${id}?conflict=1`);
  }

  await prisma.$transaction(async tx => {
    await tx.globalSectionGroup.update({
      where: { id },
      data: { name }
    });
    await tx.globalSection.deleteMany({ where: { groupId: id } });
    if (nextSections.length) {
      await tx.globalSection.createMany({
        data: nextSections.map((s, index) => ({
          groupId: id,
          type: s.type,
          order: index,
          enabled: s.enabled,
          props: JSON.parse(
            JSON.stringify(s.props ?? {})
          ) as Prisma.InputJsonValue
        }))
      });
    }
  });
}

async function getGroup(id: string) {
  const group = await prisma.globalSectionGroup.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } }
  });
  if (!group) notFound();
  return group;
}

export default function GlobalGroupEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id?: string }>;
  searchParams?: Promise<{ conflict?: string }>;
}) {
  const { id } = use(params);
  if (!id) notFound();
  use(ensureRole(`/admin/globals/${id}`));
  const group = use(getGroup(id));
  const conflict = searchParams ? use(searchParams).conflict : undefined;

  const draft = group.sections
    .map(s => {
      const flag = s.enabled ? "+" : "-";
      const json = JSON.stringify(s.props ?? {}, null, 0);
      return `${flag}${s.type}::${json}`;
    })
    .join("\n");

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

      <form action={saveGlobals} className="space-y-4">
        <input type="hidden" name="id" value={group.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={group.updatedAt.toISOString()}
        />

        {conflict ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Another edit was saved while you were editing. Reload this page and
            try again.
          </div>
        ) : null}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Name
          </label>
          <input
            name="name"
            defaultValue={group.name}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Sections
          </label>
          <p className="text-xs text-zinc-500">
            One per line: <span className="font-mono">+type::{"{json}"}</span>{" "}
            (enabled) or <span className="font-mono">-type::{"{json}"}</span>{" "}
            (disabled)
          </p>
          <textarea
            name="draft"
            defaultValue={draft}
            className="h-72 w-full rounded-md border border-zinc-300 px-3 py-2 text-xs font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder={
              '+hero::{}\n+callout::{"title":"Hello"}\n-text::{"text":"Disabled section"}'
            }
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save globals
        </button>
      </form>
    </div>
  );
}
