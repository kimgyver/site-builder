interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}

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
        "rounded px-2 py-1 text-[11px] transition " +
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
