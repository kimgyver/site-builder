import type { EditableSection } from "@/types/sections";

export type PutSectionsOk = { ok: true; updatedAt: string };
export type PutSectionsErr = { ok: false; error: string };
export type PutSectionsResponse = PutSectionsOk | PutSectionsErr;

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

export function buildSectionsSignature(sections: EditableSection[]): string {
  return JSON.stringify(
    sections.map(section => ({
      type: section.type,
      order: section.order,
      enabled: section.enabled,
      props: normalizeForStableCompare(section.props ?? {})
    }))
  );
}

export function toUserError(code: string) {
  if (code === "DB_UNAVAILABLE") {
    return "Database is unavailable. Please try again in a moment.";
  }
  if (code === "SAVE_FAILED") {
    return "Autosave failed. Please click Save sections and retry.";
  }
  return code;
}

async function readJsonSafe(
  response: Response
): Promise<Record<string, unknown>> {
  try {
    const data = (await response.json()) as unknown;
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function putSectionsRequest(args: {
  pageId: string;
  sections: EditableSection[];
  expectedUpdatedAt: string;
}): Promise<PutSectionsResponse> {
  try {
    const response = await fetch(`/api/admin/pages/${args.pageId}/sections`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        sections: args.sections,
        expectedUpdatedAt: args.expectedUpdatedAt
      })
    });

    if (response.status === 409) {
      return { ok: false, error: "STALE_PAGE" };
    }

    const json = await readJsonSafe(response);
    if (!response.ok) {
      const err = typeof json.error === "string" ? json.error : "SAVE_FAILED";
      return { ok: false, error: err };
    }
    if (json.ok === true && typeof json.updatedAt === "string") {
      return { ok: true, updatedAt: json.updatedAt };
    }

    const err = typeof json.error === "string" ? json.error : "SAVE_FAILED";
    return { ok: false, error: err };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveSectionsViaAction(args: {
  action: (
    formData: FormData
  ) => Promise<{ ok: boolean; error?: string; updatedAt?: string } | undefined>;
  sections: EditableSection[];
  pageId: string;
  expectedUpdatedAt: string;
}) {
  const formData = new FormData();
  formData.set("sections", JSON.stringify(args.sections));
  formData.set("pageId", args.pageId);
  formData.set("expectedUpdatedAt", args.expectedUpdatedAt);
  const serverResult = await args.action(formData);
  if (serverResult?.ok) {
    return { ok: true as const, updatedAt: serverResult.updatedAt };
  }
  return {
    ok: false as const,
    error: serverResult?.error || "Failed to save sections"
  };
}
