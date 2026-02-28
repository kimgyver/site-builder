import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import type { MediaItem } from "@/types/references";
import type { SectionProps } from "@/types/sections";

const MAX_MEDIA_HISTORY = 120;

type MediaEntry = {
  url: string;
  label: string;
  rank: number;
  count: number;
};

function pushMediaFromValue(
  value: unknown,
  out: Map<string, MediaEntry>,
  fallbackLabel: string,
  rank: number
) {
  if (typeof value !== "string") return;
  const url = value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return;
  const existing = out.get(url);
  if (existing) {
    existing.count += 1;
    existing.rank = Math.min(existing.rank, rank);
    return;
  }

  const short = url.length > 72 ? `${url.slice(0, 69)}...` : url;
  out.set(url, {
    url,
    label: `${fallbackLabel} · ${short}`,
    rank,
    count: 1
  });
}

export async function GET(request: NextRequest) {
  if (isAdminAuthEnabled()) {
    let cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieValue) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/sb_admin_session=([^;]+)/);
        if (match) cookieValue = match[1];
      }
    }
    const role = getRoleFromSessionCookie(cookieValue);
    if (!role) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const [pages, sections] = await Promise.all([
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        locale: true
      }
    }),
    prisma.section.findMany({
      where: { enabled: true },
      select: {
        type: true,
        props: true,
        page: {
          select: {
            id: true,
            title: true,
            slug: true,
            locale: true,
            updatedAt: true
          }
        }
      },
      orderBy: { order: "asc" }
    })
  ]);

  const pageRankById = new Map<string, number>();
  pages.forEach((page, index) => {
    pageRankById.set(page.id, index);
  });

  const mediaMap = new Map<string, MediaEntry>();

  for (const section of sections) {
    const props =
      section.props && typeof section.props === "object"
        ? (section.props as SectionProps)
        : {};

    const baseLabel = section.page?.title
      ? `${section.page.title}`
      : section.page?.slug
        ? `/${section.page.locale}/${section.page.slug}`
        : section.type;

    const rank =
      section.page?.id && pageRankById.has(section.page.id)
        ? (pageRankById.get(section.page.id) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;

    pushMediaFromValue(props.url, mediaMap, baseLabel, rank);
    pushMediaFromValue(props.src, mediaMap, baseLabel, rank);

    const html = typeof props.html === "string" ? props.html : "";
    if (html) {
      const srcMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
      for (const match of srcMatches) {
        pushMediaFromValue(match[1], mediaMap, baseLabel, rank);
      }
    }
  }

  const sortedMedia = Array.from(mediaMap.values())
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.count !== b.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    })
    .slice(0, MAX_MEDIA_HISTORY)
    .map(({ url, label }) => ({ url, label }) satisfies MediaItem);

  return NextResponse.json({
    pages,
    media: sortedMedia,
    mediaTotal: mediaMap.size,
    mediaLimit: MAX_MEDIA_HISTORY
  });
}
