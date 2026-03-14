type TiptapEditorSkeletonProps = {
  className?: string;
};

export function TiptapEditorSkeleton({ className }: TiptapEditorSkeletonProps) {
  return (
    <div className={"space-y-1 " + (className ?? "")}>
      <div className="h-8 animate-pulse rounded-md border border-zinc-200 bg-zinc-50" />
      <div className="min-h-45 w-full animate-pulse rounded-md border border-zinc-300 bg-white px-3 py-2">
        <div className="space-y-2 pt-1">
          <div className="h-3 w-11/12 rounded bg-zinc-200" />
          <div className="h-3 w-4/5 rounded bg-zinc-200" />
          <div className="h-3 w-3/5 rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}
