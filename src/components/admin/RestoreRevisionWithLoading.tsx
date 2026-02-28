"use client";
import { useState, useRef } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent align-middle" />
  );
}

export default function RestoreRevisionWithLoading({
  pageId,
  revisionId,
  version,
  action,
  onSuccess
}: {
  pageId: string;
  revisionId: string;
  version: number;
  action: (
    formData: FormData
  ) => Promise<{ ok?: boolean; error?: string; updatedAt?: string } | unknown>;
  onSuccess?: (updatedAt?: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        setLoading(true);
        setError(null);
        await new Promise(r => setTimeout(r, 100));
        const result = (await action(formData)) as
          | { ok?: boolean; error?: string; updatedAt?: string }
          | undefined;
        if (result && typeof result === "object" && "ok" in result) {
          if (result.ok) {
            onSuccess?.(result.updatedAt);
          } else {
            setError(result.error ?? "Failed to restore revision");
          }
        } else {
          onSuccess?.();
        }
        setLoading(false);
      }}
      className="relative"
    >
      {loading && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2">
          <Spinner />
        </span>
      )}
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <ConfirmSubmitButton
        message={`Restore revision v${version}? Current unpublished changes will be replaced.`}
        className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-100 transition-all"
      >
        {loading ? <Spinner /> : "Restore"}
      </ConfirmSubmitButton>
      {error ? (
        <span className="ml-2 text-[11px] text-red-600">{error}</span>
      ) : null}
    </form>
  );
}
