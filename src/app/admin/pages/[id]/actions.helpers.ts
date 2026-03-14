import { PageStatus, Prisma } from "@prisma/client";
import { sanitizeCmsHtml } from "@/lib/sanitizeCmsHtml";

export function isMissingTable(error: unknown, tableName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2021") {
    return false;
  }
  const table =
    error.meta && typeof error.meta === "object" && "table" in error.meta
      ? String((error.meta as Record<string, unknown>).table ?? "")
      : "";
  return table.toLowerCase().includes(tableName.toLowerCase());
}

export function isRevisionSchemaIssue(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code === "P2022") {
    return true;
  }
  return (
    isMissingTable(error, "pagerevision") ||
    isMissingTable(error, "sectionrevision")
  );
}

export function isIgnorableRevisionError(error: unknown) {
  if (isRevisionSchemaIssue(error)) {
    return true;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }
  return false;
}

export function sanitizeRichHtml(input: unknown) {
  return sanitizeCmsHtml(input);
}

export function normalizeSnapshotSections(rawSections: unknown): Array<{
  type: string;
  order: number;
  enabled: boolean;
  props: Prisma.InputJsonValue;
}> {
  if (!Array.isArray(rawSections)) return [];
  return rawSections
    .map((section, index) => {
      const candidate =
        section && typeof section === "object"
          ? (section as Record<string, unknown>)
          : {};
      const type = String(candidate.type ?? "text");
      const enabled = candidate.enabled !== false;
      const rawProps =
        candidate.props && typeof candidate.props === "object"
          ? (candidate.props as Record<string, unknown>)
          : {};
      const nextProps = {
        ...rawProps,
        html: sanitizeRichHtml(rawProps.html),
        leftHtml: sanitizeRichHtml(rawProps.leftHtml),
        rightHtml: sanitizeRichHtml(rawProps.rightHtml),
        url:
          typeof rawProps.url === "string"
            ? String(rawProps.url)
            : rawProps.url,
        src:
          typeof rawProps.src === "string"
            ? String(rawProps.src)
            : rawProps.src,
        title:
          typeof rawProps.title === "string"
            ? String(rawProps.title)
            : rawProps.title,
        subtitle:
          typeof rawProps.subtitle === "string"
            ? String(rawProps.subtitle)
            : rawProps.subtitle,
        alt:
          typeof rawProps.alt === "string" ? String(rawProps.alt) : rawProps.alt
      };
      const props = JSON.parse(
        JSON.stringify(nextProps)
      ) as Prisma.InputJsonValue;
      return {
        type,
        order: index,
        enabled,
        props
      };
    })
    .filter(section => Boolean(section.type));
}

function normalizeForStableCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForStableCompare);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, [key, entry]) => {
        acc[key] = normalizeForStableCompare(entry);
        return acc;
      }, {});
  }
  return value;
}

export function buildSectionsSignature(
  sections: Array<{
    type: string;
    order: number;
    enabled: boolean;
    props: Prisma.InputJsonValue;
  }>
) {
  return JSON.stringify(
    sections.map(section => ({
      type: section.type,
      order: section.order,
      enabled: section.enabled,
      props: normalizeForStableCompare(section.props)
    }))
  );
}

function parseJsonStringMaybe(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractSectionsFromUnknown(input: unknown): unknown[] {
  const parsed = parseJsonStringMaybe(input);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== "object") {
    return [];
  }
  const obj = parsed as Record<string, unknown>;

  const candidateSections = parseJsonStringMaybe(obj.sections);
  if (Array.isArray(candidateSections)) {
    return candidateSections;
  }

  const numericKeys = Object.keys(obj).filter(key => /^\d+$/.test(key));
  if (numericKeys.length > 0) {
    return numericKeys
      .sort((a, b) => Number(a) - Number(b))
      .map(key => obj[key]);
  }

  if ("snapshot" in obj) {
    return extractSectionsFromUnknown(obj.snapshot);
  }

  return [];
}

export function extractRevisionPayload(snapshotRaw: unknown) {
  const parsed = parseJsonStringMaybe(snapshotRaw);
  const snapshotObject =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const sections = normalizeSnapshotSections(
    extractSectionsFromUnknown(parsed)
  );

  return {
    sections,
    title:
      snapshotObject && typeof snapshotObject.title === "string"
        ? snapshotObject.title
        : undefined,
    slug:
      snapshotObject && typeof snapshotObject.slug === "string"
        ? snapshotObject.slug
        : undefined,
    status:
      snapshotObject &&
      (snapshotObject.status === "DRAFT" ||
        snapshotObject.status === "PUBLISHED")
        ? (snapshotObject.status as PageStatus)
        : undefined,
    seoTitle:
      snapshotObject && typeof snapshotObject.seoTitle === "string"
        ? snapshotObject.seoTitle
        : undefined,
    seoDescription:
      snapshotObject && typeof snapshotObject.seoDescription === "string"
        ? snapshotObject.seoDescription
        : undefined
  };
}
