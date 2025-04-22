import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  id: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ trigger, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  // Update tooltip position
  useEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      if (!triggerRect || !tooltipRect) return;

      const top = triggerRect.top + window.scrollY - tooltipRect.height - 8;
      const left = triggerRect.left + window.scrollX + triggerRect.width / 2;

      setPosition({
        top,
        left: Math.max(
          tooltipRect.width / 2 + 8,
          Math.min(left, window.innerWidth - tooltipRect.width / 2 - 8)
        ),
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Close if you tap outside
  useEffect(() => {
    if (!isTouch || !open) return;
    function handleTouch(e: TouchEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("touchstart", handleTouch);
    return () => document.removeEventListener("touchstart", handleTouch);
  }, [open, isTouch]);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block cursor-pointer"
        onClick={() => isTouch && setOpen(!open)}
        onMouseEnter={() => !isTouch && setOpen(true)}
        onMouseLeave={() => !isTouch && setOpen(false)}
      >
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "absolute",
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: "translateX(-50%)",
            }}
            className="fixed bg-white border border-gray-200 p-2 rounded-md shadow-lg text-sm text-gray-600 w-64 z-[9999]"
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
