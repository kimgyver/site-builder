import { prisma } from "@/lib/prisma";
import type { SupportedLocale } from "@/lib/i18n";

export const DEFAULT_NAVIGATION_STYLE = {
  menuTextColor: undefined,
  menuHoverColor: undefined,
  menuFontSizePx: undefined,
  dividerColor: undefined
};

export const DEFAULT_BRANDING = {
  brandName: "",
  brandHref: undefined,
  brandLogoUrl: undefined,
  brandLogoHeightPx: 32
};

export async function findPageByLocale(params: {
  slug: string;
  locale: SupportedLocale;
  preview?: string;
}) {
  const { slug, locale, preview } = params;
  const where =
    preview && preview.trim()
      ? {
          slug,
          locale,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, locale, status: "PUBLISHED" as const };

  return prisma.page.findFirst({
    where,
    include: { sections: { orderBy: { order: "asc" } } }
  });
}

export async function getMenuByLocation(location: "header" | "footer") {
  try {
    return await prisma.menu.findFirst({
      where: { location },
      select: {
        id: true,
        name: true,
        location: true,
        items: {
          orderBy: { order: "asc" },
          select: { id: true, href: true, label: true, openInNewTab: true }
        }
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("openInNewTab") || message.includes("OpenInNewTab")) {
      return prisma.menu.findFirst({
        where: { location },
        select: {
          id: true,
          name: true,
          location: true,
          items: {
            orderBy: { order: "asc" },
            select: { id: true, href: true, label: true }
          }
        }
      });
    }
    throw e;
  }
}

export async function loadPageShellData() {
  const [headerMenu, footerMenu, headerGroups, footerGroups] =
    await Promise.all([
      getMenuByLocation("header"),
      getMenuByLocation("footer"),
      prisma.globalSectionGroup.findMany({
        where: { location: "header" },
        include: { sections: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" }
      }),
      prisma.globalSectionGroup.findMany({
        where: { location: "footer" },
        include: { sections: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" }
      })
    ]);

  return { headerMenu, footerMenu, headerGroups, footerGroups };
}

export function pickGlobalGroup<T extends { id: string; isDefault: boolean }>(
  groups: T[],
  preferredId?: string | null
) {
  if (preferredId) {
    const matched = groups.find(group => group.id === preferredId);
    if (matched) return matched;
  }
  const defaultGroup = groups.find(group => group.isDefault);
  if (defaultGroup) return defaultGroup;
  return groups[0] ?? null;
}
