import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  getRoleFromSessionCookie,
  isAdminAuthEnabled
} from "@/lib/adminAuth";
import type { MediaItem } from "@/types/references";
import type { SectionProps } from "@/types/sections";

function pushMediaFromValue(
  value: unknown,
  out: Map<string, MediaItem>,
  fallbackLabel: string
) {
  if (typeof value !== "string") return;
  const url = value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return;
  if (out.has(url)) return;

  const short = url.length > 72 ? `${url.slice(0, 69)}...` : url;
  out.set(url, {
    url,
    label: `${fallbackLabel} · ${short}`
  });
}

export async function GET(request: NextRequest) {
  if (isAdminAuthEnabled()) {
    let cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieValue) {
      const cookieHeader = request.headers.get("cookie");
      console.log("cookieHeader:", cookieHeader);
      if (cookieHeader) {
        const match = cookieHeader.match(/sb_admin_session=([^;]+)/);
        if (match) cookieValue = match[1];
        console.log("parsedCookieValue:", cookieValue);
      }
    }
    console.log("finalCookieValue:", cookieValue);
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
            title: true,
            slug: true,
            locale: true
          }
        }
      },
      orderBy: { order: "asc" }
    })
  ]);

  const mediaMap = new Map<string, MediaItem>();

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

    pushMediaFromValue(props.url, mediaMap, baseLabel);
    pushMediaFromValue(props.src, mediaMap, baseLabel);

    const html = typeof props.html === "string" ? props.html : "";
    if (html) {
      const srcMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
      for (const match of srcMatches) {
        pushMediaFromValue(match[1], mediaMap, baseLabel);
      }
    }
  }

  return NextResponse.json({
    pages,
    media: Array.from(mediaMap.values())
  });
}
