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
import MenuEditorClient from "@/components/admin/MenuEditorClient";

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

type MenuItemInput = { label: string; href: string; openInNewTab: boolean };
type SaveState =
  | { status: "idle" }
  | { status: "saved"; savedAt: number }
  | { status: "error"; message: string };

function parseItems(raw: string): MenuItemInput[] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [labelRaw, hrefRaw] = line.split("::");
      const label = (labelRaw ?? "").trim();
      const href = (hrefRaw ?? "").trim();
      return {
        label: label || href || "Link",
        href: href || "/",
        openInNewTab: false
      };
    });
}

function parseItemsJson(raw: string): MenuItemInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => {
        const maybe = item as {
          label?: unknown;
          href?: unknown;
          openInNewTab?: unknown;
        };
        const label = typeof maybe.label === "string" ? maybe.label.trim() : "";
        const href = typeof maybe.href === "string" ? maybe.href.trim() : "";
        const openInNewTab = Boolean(maybe.openInNewTab);
        return {
          label: label || href || "Link",
          href: href || "/",
          openInNewTab
        };
      })
      .filter(item => Boolean(item.href));
  } catch {
    return [];
  }
}

async function saveMenu(
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const role = await ensureRole(`/admin/menus/${id}`);
  if (!canEditContent(role)) {
    return { status: "error", message: "Unauthorized" };
  }
  if (!id) {
    return { status: "error", message: "Missing menu id" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const itemsJsonRaw = String(formData.get("itemsJson") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "");
  const nextItems = itemsJsonRaw
    ? parseItemsJson(itemsJsonRaw)
    : parseItems(itemsRaw);

  try {
    await prisma.$transaction(async tx => {
      await tx.menu.update({
        where: { id },
        data: { name }
      });
      await tx.menuItem.deleteMany({ where: { menuId: id } });
      if (nextItems.length) {
        await tx.menuItem.createMany({
          data: nextItems.map((item, index) => ({
            menuId: id,
            label: item.label,
            href: item.href,
            openInNewTab: item.openInNewTab,
            order: index
          }))
        });
      }
    });
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Save failed"
    };
  }

  return { status: "saved", savedAt: Date.now() };
}

async function getMenu(id: string) {
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } }
  });
  if (!menu) notFound();
  return menu;
}

export default async function MenuEditPage({
  params
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();
  const role = await ensureRole(`/admin/menus/${id}`);
  const canEdit = canEditContent(role);
  const menu = await getMenu(id);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit menu</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Location: <span className="font-medium">{menu.location}</span>
          </p>
        </div>
        <Link
          href="/admin/menus"
          className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back
        </Link>
      </div>

      <MenuEditorClient
        menuId={menu.id}
        location={menu.location}
        initialName={menu.name}
        initialItems={menu.items.map(item => ({
          label: item.label,
          href: item.href,
          openInNewTab: item.openInNewTab ?? false
        }))}
        saveAction={saveMenu}
        canEdit={canEdit}
      />
    </div>
  );
}
