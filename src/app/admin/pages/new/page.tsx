import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PageStatus, RevisionSource } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled,
  type AdminRole
} from "@/lib/adminAuth";

async function getAdminRoleForAction(nextPath: string): Promise<AdminRole> {
  if (!isAdminAuthEnabled()) return "publisher";

  const cookieStore = await cookies();
  const role = getRoleFromSessionCookie(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }

  return role;
}

async function createPage(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const status = String(formData.get("status") ?? PageStatus.DRAFT);
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();

  if (!title || !slug) {
    // 간단히 무시하고 돌아가지만, 실제로는 에러 처리가 필요합니다.
    return;
  }

  const role = await getAdminRoleForAction("/admin/pages/new");
  if (role === "editor" && status === PageStatus.PUBLISHED) {
    redirect("/admin/pages/new?error=forbidden-publish");
  }

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      status: status === "PUBLISHED" ? PageStatus.PUBLISHED : PageStatus.DRAFT
    }
  });

  await prisma.pageRevision.create({
    data: {
      pageId: page.id,
      version: 1,
      source:
        status === "PUBLISHED"
          ? RevisionSource.PUBLISH
          : RevisionSource.METADATA,
      note:
        status === "PUBLISHED" ? "Page created and published" : "Page created",
      snapshot: {
        title,
        slug,
        status:
          status === "PUBLISHED" ? PageStatus.PUBLISHED : PageStatus.DRAFT,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        sections: []
      }
    }
  });

  redirect(`/admin/pages/${page.id}`);
}

export default async function NewPage({
  searchParams
}: {
  searchParams: Promise<{ error?: "forbidden-publish" }>;
}) {
  const { error } = await searchParams;

  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);

  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent("/admin/pages/new")}`);
  }

  const canPublish = role === "publisher";

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New page</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Define the basic information of the page. You will add sections (hero,
          text, image, FAQ) after creating it.
        </p>
      </div>

      {error === "forbidden-publish" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Editor role cannot create published pages.
        </div>
      ) : null}

      <form action={createPage} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Title
          </label>
          <input
            name="title"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="About us"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            SEO title (optional)
          </label>
          <input
            name="seoTitle"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Custom title for search/preview"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            SEO description (optional)
          </label>
          <textarea
            name="seoDescription"
            className="h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Short summary for search and link previews"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Slug
          </label>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <span className="rounded-l-md border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-xs">
              /
            </span>
            <input
              name="slug"
              className="w-full rounded-r-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="about"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-800">
            Status
          </label>
          <select
            name="status"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            defaultValue={PageStatus.DRAFT}
          >
            <option value={PageStatus.DRAFT}>Draft</option>
            <option value={PageStatus.PUBLISHED} disabled={!canPublish}>
              Published
            </option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create page
        </button>
      </form>
    </div>
  );
}
