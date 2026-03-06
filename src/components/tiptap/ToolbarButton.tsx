import type { ToolbarButtonProps } from "@/types/components";

export function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  title
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
      className={
        "rounded px-2 py-0.5 text-[11px] transition md:px-2.5 md:py-1 md:text-xs " +
        (disabled
          ? "opacity-40"
          : active
            ? "bg-zinc-200 text-zinc-900"
            : "hover:bg-zinc-200")
      }
    >
      {label}
    </button>
  );
}
