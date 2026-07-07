"use client";

import { useEffect, useRef, useState } from "react";
import { useCadia } from "@/lib/store";

/**
 * Discreet footer trigger for the owner console.
 *
 * Looks like a tiny dim bullet point between two pieces of footer text.
 * Requires 5 rapid clicks (within 2.5s) to fire : prevents accidental
 * activation by regular users while still being accessible without devtools.
 *
 * On the 3rd click onwards, a faint progress ring fills in to give the
 * owner visual feedback that they're unlocking something.
 */
export function FooterDot() {
  const openAdminConsole = useCadia((s) => s.openAdminConsole);
  const clicksRef = useRef<number[]>([]);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    const now = Date.now();
    clicksRef.current = [...clicksRef.current.filter((t) => now - t < 2500), now];
    const count = clicksRef.current.length;
    setProgress(count / 5);
    setArmed(count >= 2);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clicksRef.current = [];
      setProgress(0);
      setArmed(false);
    }, 2500);

    if (count >= 5) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      clicksRef.current = [];
      setProgress(0);
      setArmed(false);
      openAdminConsole();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="."
      tabIndex={-1}
      className={`relative inline-flex items-center justify-center mx-1.5 align-middle transition-all ${
        armed ? "scale-125" : "scale-100"
      }`}
      style={{
        width: armed ? 10 : 4,
        height: armed ? 10 : 4,
        borderRadius: "9999px",
        background: armed ? "rgba(94, 58, 109, 0.6)" : "rgba(138, 153, 171, 0.4)",
        border: "none",
        cursor: "default",
        outline: "none",
      }}
    >
      {progress > 0 && (
        <svg
          className="absolute inset-0 -m-0.5 pointer-events-none"
          viewBox="0 0 20 20"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="rgba(94, 58, 109, 0.7)"
            strokeWidth="1.5"
            strokeDasharray={`${progress * 50.27} 50.27`}
            style={{ transition: "stroke-dasharray 0.2s ease" }}
          />
        </svg>
      )}
    </button>
  );
}
