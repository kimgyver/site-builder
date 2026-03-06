export function getChangeTone(kind: "added" | "removed" | "modified") {
  if (kind === "added") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      text: "text-emerald-700"
    };
  }
  if (kind === "removed") {
    return {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      text: "text-rose-700"
    };
  }
  return {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    text: "text-amber-700"
  };
}
