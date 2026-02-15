"use client";

import type { MouseEvent } from "react";
import type { ConfirmSubmitButtonProps } from "@/types/components";

export function ConfirmSubmitButton({
  message,
  className,
  children
}: ConfirmSubmitButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };

  return (
    <button type="submit" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
