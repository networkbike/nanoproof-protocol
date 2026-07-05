"use client";

/**
 * "Take a Tour" button — click to (re)launch the guided tour. Dispatching
 * the global event rather than calling the context directly keeps this
 * component decoupled from the provider tree.
 */
import { openTour } from "./tour-context";

export function TakeATourButton({
  variant = "primary",
  className = "",
}: {
  variant?: "primary" | "ghost";
  className?: string;
}) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={openTour}
        className={
          "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white " +
          className
        }
      >
        <span>🎓</span>
        <span>Take a Tour</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openTour}
      className={
        "inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 " +
        className
      }
    >
      <span>🎓</span>
      <span>Take a Tour</span>
    </button>
  );
}