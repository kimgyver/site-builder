export function getSafeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    return color;
  }
  if (/^rgba?\(/i.test(color) || /^hsla?\(/i.test(color)) {
    return color;
  }
  return undefined;
}

export function getSafeBackgroundImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (
    /^data:image\/(png|jpe?g|webp|gif|bmp|avif);base64,[a-z0-9+/=\s]+$/i.test(
      raw
    )
  ) {
    return raw.length <= 2_500_000 ? raw : undefined;
  }
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getSafeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getSafeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return fallback;
}

export function getSafeSectionGap(value: unknown): number {
  const fallback = 32;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(96, Math.max(8, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(96, Math.max(8, Math.round(parsed)));
    }
  }
  return fallback;
}

export function getSafeBackgroundDimPercent(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(90, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(90, Math.max(0, Math.round(parsed)));
    }
  }
  return 0;
}

export function getSafeBackgroundMode(
  value: unknown
): "color" | "image" | "both" {
  if (value === "color" || value === "image" || value === "both") {
    return value;
  }
  return "both";
}

export function getSafeBackgroundImageRenderMode(
  value: unknown
): "cover" | "original" | "tile" {
  if (value === "cover" || value === "original" || value === "tile") {
    return value;
  }
  return "cover";
}

export function getSafeFontSizePx(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(24, Math.max(12, value));
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.min(24, Math.max(12, parsed));
    }
  }
  return undefined;
}

export function getYouTubeEmbedSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    }
    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    }
    if (host === "youtube-nocookie.com") {
      const id = url.pathname.replace(/^\/embed\//, "").split("/")[0];
      if (!id) return null;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function getMapsEmbedSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (
      !host.includes("google.com") &&
      !host.includes("maps.google.com") &&
      !host.includes("maps.app.goo.gl")
    ) {
      return null;
    }
    if (url.pathname.includes("/maps/embed")) {
      return url.toString();
    }
    const pb = url.searchParams.get("pb");
    if (pb) {
      return `https://www.google.com/maps/embed?pb=${encodeURIComponent(pb)}`;
    }
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
    return null;
  } catch {
    return null;
  }
}
