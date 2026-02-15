import { useEffect } from "react";

export function Toast({
  message,
  show,
  onClose
}: {
  message: string;
  show: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 1000,
        background: "#222",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: 16,
        fontWeight: 500,
        pointerEvents: "none"
      }}
    >
      {message}
    </div>
  );
}
