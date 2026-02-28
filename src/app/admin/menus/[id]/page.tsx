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

function parseItems(raw: string): Array<{ label: string; href: string }> {
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
        href: href || "/"
      };
    });
}

async function saveMenu(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const role = await ensureRole(`/admin/menus/${id}`);
  if (!canEditContent(role)) return;
  if (!id) return;

  const name = String(formData.get("name") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "");
  const nextItems = parseItems(itemsRaw);

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
          order: index
        }))
      });
    }
  });
}

async function getMenu(id: string) {
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } }
  });
  if (!menu) notFound();
  return menu;
}

export default function MenuEditPage({
  params
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = use(params);
  if (!id) notFound();
  use(ensureRole(`/admin/menus/${id}`));
  const menu = use(getMenu(id));

  const itemsText = menu.items
    .map(item => `${item.label}::${item.href}`)
    .join("\n");

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

      <form action={saveMenu} className="space-y-4">
        <input type="hidden" name="id" value={menu.id} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Name
          </label>
          <input
            name="name"
            defaultValue={menu.name}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Items
          </label>
          <p className="text-xs text-zinc-500">One per line: label::href</p>
          <textarea
            name="items"
            defaultValue={itemsText}
            className="h-52 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Home::/\nAbout::/about"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save menu
        </button>
      </form>
    </div>
  );
}
