import { useCallback, useEffect, useRef, useState } from "react";

type RevisionRecord = {
  id: string;
};

export function usePagedRevisions<TRevision extends RevisionRecord>({
  pageId,
  initialRevisions,
  pageSize,
  listPageRevisions
}: {
  pageId: string;
  initialRevisions: TRevision[];
  pageSize: number;
  listPageRevisions: (args: {
    pageId: string;
    skip?: number;
    take?: number;
  }) => Promise<{
    ok: boolean;
    revisions: TRevision[];
    hasMore: boolean;
    error?: string;
  }>;
}) {
  const [revisions, setRevisions] = useState<TRevision[]>(initialRevisions);
  const [hasMoreRevisions, setHasMoreRevisions] = useState(
    initialRevisions.length >= pageSize
  );
  const [isLoadingMoreRevisions, setIsLoadingMoreRevisions] = useState(false);
  const revisionsRefreshSequenceRef = useRef(0);

  const fetchRevisions = useCallback(
    async ({ skip, take }: { skip: number; take: number }) => {
      const payload = await listPageRevisions({ pageId, skip, take });
      if (!payload.ok || !Array.isArray(payload.revisions)) {
        return null;
      }

      return {
        revisions: payload.revisions as TRevision[],
        hasMore:
          typeof payload.hasMore === "boolean"
            ? payload.hasMore
            : (payload.revisions as unknown[]).length >= take
      };
    },
    [listPageRevisions, pageId]
  );

  const refreshRecentRevisions = useCallback(async () => {
    const refreshSequence = revisionsRefreshSequenceRef.current + 1;
    revisionsRefreshSequenceRef.current = refreshSequence;

    try {
      const result = await fetchRevisions({
        skip: 0,
        take: pageSize
      });
      if (!result) {
        return;
      }

      if (refreshSequence !== revisionsRefreshSequenceRef.current) {
        return;
      }

      setRevisions(result.revisions);
      setHasMoreRevisions(result.hasMore);
    } catch {}
  }, [fetchRevisions, pageSize]);

  const loadMoreRevisions = useCallback(async () => {
    if (isLoadingMoreRevisions || !hasMoreRevisions) {
      return;
    }

    setIsLoadingMoreRevisions(true);
    try {
      const result = await fetchRevisions({
        skip: revisions.length,
        take: pageSize
      });
      if (!result) {
        return;
      }

      setRevisions(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const uniqueNext = result.revisions.filter(
          item => !existingIds.has(item.id)
        );
        return uniqueNext.length > 0 ? [...prev, ...uniqueNext] : prev;
      });
      setHasMoreRevisions(result.hasMore);
    } finally {
      setIsLoadingMoreRevisions(false);
    }
  }, [
    fetchRevisions,
    hasMoreRevisions,
    isLoadingMoreRevisions,
    pageSize,
    revisions.length
  ]);

  useEffect(() => {
    void refreshRecentRevisions();
  }, [refreshRecentRevisions]);

  return {
    revisions,
    hasMoreRevisions,
    isLoadingMoreRevisions,
    refreshRecentRevisions,
    loadMoreRevisions
  };
}
