type SnapshotPageStatus = "DRAFT" | "PUBLISHED";

type SnapshotSection = {
  type: string;
  order: number;
  enabled: boolean;
  props: Record<string, unknown>;
};

type SnapshotPayload = {
  title?: string;
  slug?: string;
  status?: SnapshotPageStatus;
  seoTitle?: string;
  seoDescription?: string;
  sections: SnapshotSection[];
};

type CurrentPageMeta = {
  title: string;
  slug: string;
  status: SnapshotPageStatus;
  seoTitle: string | null;
  seoDescription: string | null;
};

type CurrentSection = {
  type: string;
  order: number;
  enabled: boolean;
  props: Record<string, unknown>;
};

export type RevisionMetaDiff = {
  field: "title" | "slug" | "status" | "seoTitle" | "seoDescription";
  label: string;
  before: string;
  after: string;
};

export type RevisionSectionDiffSummary = {
  beforeCount: number;
  afterCount: number;
  added: number;
  removed: number;
  changed: number;
  visibilityChanged: number;
};

export type RevisionDiffSummary = {
  metaChanges: RevisionMetaDiff[];
  sections: RevisionSectionDiffSummary;
  beforeSectionsJson: string;
  afterSectionsJson: string;
};

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

  const objectValue = parsed as Record<string, unknown>;
  const candidateSections = parseJsonStringMaybe(objectValue.sections);
  if (Array.isArray(candidateSections)) {
    return candidateSections;
  }

  const numericKeys = Object.keys(objectValue).filter(key => /^\d+$/.test(key));
  if (numericKeys.length > 0) {
    return numericKeys
      .sort((a, b) => Number(a) - Number(b))
      .map(key => objectValue[key]);
  }

  if ("snapshot" in objectValue) {
    return extractSectionsFromUnknown(objectValue.snapshot);
  }

  return [];
}

function normalizeSnapshotSections(rawSections: unknown): SnapshotSection[] {
  if (!Array.isArray(rawSections)) {
    return [];
  }
  return rawSections
    .map((section, index) => {
      const candidate =
        section && typeof section === "object"
          ? (section as Record<string, unknown>)
          : {};
      const rawProps =
        candidate.props && typeof candidate.props === "object"
          ? (candidate.props as Record<string, unknown>)
          : {};
      return {
        type: String(candidate.type ?? "text"),
        order: typeof candidate.order === "number" ? candidate.order : index,
        enabled: candidate.enabled !== false,
        props: rawProps
      };
    })
    .filter(section => section.type.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));
}

function extractRevisionPayload(snapshotRaw: unknown): SnapshotPayload {
  const parsed = parseJsonStringMaybe(snapshotRaw);
  const snapshotObject =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  return {
    sections: normalizeSnapshotSections(extractSectionsFromUnknown(parsed)),
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
        ? (snapshotObject.status as SnapshotPageStatus)
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

function normalizeCurrentSections(
  sections: CurrentSection[]
): SnapshotSection[] {
  return [...sections]
    .map((section, index) => ({
      type: section.type,
      order: typeof section.order === "number" ? section.order : index,
      enabled: section.enabled !== false,
      props:
        section.props && typeof section.props === "object" ? section.props : {}
    }))
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));
}

function normalizeForStableCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForStableCompare);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right)
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
      acc[key] = normalizeForStableCompare(entryValue);
      return acc;
    }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForStableCompare(value));
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "(empty)";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

export function buildRevisionDiffSummary(params: {
  currentPage: CurrentPageMeta;
  currentSections: CurrentSection[];
  snapshotRaw: unknown;
}): RevisionDiffSummary {
  const payload = extractRevisionPayload(params.snapshotRaw);
  const beforeSections = normalizeCurrentSections(params.currentSections);
  const afterSections = payload.sections;

  const metaChanges: RevisionMetaDiff[] = [];

  const metaFields: Array<{
    field: RevisionMetaDiff["field"];
    label: string;
    before: unknown;
    after: unknown;
  }> = [
    {
      field: "title",
      label: "Title",
      before: params.currentPage.title,
      after: payload.title
    },
    {
      field: "slug",
      label: "Slug",
      before: params.currentPage.slug,
      after: payload.slug
    },
    {
      field: "status",
      label: "Status",
      before: params.currentPage.status,
      after: payload.status
    },
    {
      field: "seoTitle",
      label: "SEO title",
      before: params.currentPage.seoTitle,
      after: payload.seoTitle
    },
    {
      field: "seoDescription",
      label: "SEO description",
      before: params.currentPage.seoDescription,
      after: payload.seoDescription
    }
  ];

  for (const metaField of metaFields) {
    if (metaField.after === undefined) {
      continue;
    }
    if (toDisplayValue(metaField.before) !== toDisplayValue(metaField.after)) {
      metaChanges.push({
        field: metaField.field,
        label: metaField.label,
        before: toDisplayValue(metaField.before),
        after: toDisplayValue(metaField.after)
      });
    }
  }

  const maxLength = Math.max(beforeSections.length, afterSections.length);
  let added = 0;
  let removed = 0;
  let changed = 0;
  let visibilityChanged = 0;

  for (let index = 0; index < maxLength; index += 1) {
    const beforeSection = beforeSections[index];
    const afterSection = afterSections[index];

    if (!beforeSection && afterSection) {
      added += 1;
      continue;
    }
    if (beforeSection && !afterSection) {
      removed += 1;
      continue;
    }
    if (!beforeSection || !afterSection) {
      continue;
    }

    const isDifferent =
      beforeSection.type !== afterSection.type ||
      beforeSection.enabled !== afterSection.enabled ||
      stableStringify(beforeSection.props) !==
        stableStringify(afterSection.props);

    if (isDifferent) {
      changed += 1;
      if (beforeSection.enabled !== afterSection.enabled) {
        visibilityChanged += 1;
      }
    }
  }

  return {
    metaChanges,
    sections: {
      beforeCount: beforeSections.length,
      afterCount: afterSections.length,
      added,
      removed,
      changed,
      visibilityChanged
    },
    beforeSectionsJson: JSON.stringify(beforeSections, null, 2),
    afterSectionsJson: JSON.stringify(afterSections, null, 2)
  };
}
