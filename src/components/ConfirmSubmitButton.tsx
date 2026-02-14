"use client";

import type { MouseEvent, ReactNode } from "react";

interface ConfirmSubmitButtonProps {
  message: string;
  className?: string;
  children: ReactNode;
}

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
