import AdminPageClientWrapper from "@/components/admin/AdminPageClientWrapper";

import {
  updatePage,
  deletePage,
  saveSections,
  restoreRevision
} from "./actions";

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

//
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";

import { use } from "react";

async function getPageData(id: string) {
  const cookieStore = await cookies();
  const role = isAdminAuthEnabled()
    ? getRoleFromSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    : ("publisher" as const);
  if (!role) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/pages/${id}`)}`);
  }
  const canPublish = role === "publisher";
  const canDelete = role === "publisher";
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { order: "asc" } },
      revisions: {
        orderBy: { version: "desc" },
        take: 5,
        select: {
          id: true,
          version: true,
          source: true,
          createdAt: true,
          note: true
        }
      }
    }
  });
  if (!page) {
    notFound();
  }
  return { page, canDelete, canPublish };
}

export default function EditPage({
  params
}: {
  params: Promise<{ id?: string }>;
}) {
  // Unwrap params Promise using use()
  const { id } = use(params);
  if (!id) {
    notFound();
  }
  const { page, canDelete, canPublish } = use(getPageData(id));
  return (
    <AdminPageClientWrapper
      page={page}
      canDelete={canDelete}
      canPublish={canPublish}
      saveSections={saveSections}
      updatePage={updatePage}
      deletePage={deletePage}
      restoreRevision={restoreRevision}
    />
  );
}
