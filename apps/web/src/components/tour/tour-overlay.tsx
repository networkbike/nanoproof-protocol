"use client";

/**
 * Tour overlay — spotlight on a target element + dim/blur background
 * + a positioned card with step copy + nav controls.
 *
 * Implementation notes:
 *  - Renders a full-screen backdrop (semi-transparent + backdrop-blur).
 *  - When the current step has a `selector`, draws a "hole" around the
 *    target by reading getBoundingClientRect() and overlaying a bright
 *    ring + clipping the backdrop.
 *  - The card is positioned relative to the spotlight when possible,
 *    falling back to center-of-screen when no target or viewport edge.
 *  - Each navigation re-reads the target position (handles resize + scroll).
 */
import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTour, type TourStep } from "./tour-context";

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pickCardPosition(
  target: Position | null,
  side: TourStep["side"],
  cardWidth: number,
  cardHeight: number,
  pad: number,
): { top: number; left: number; arrowSide?: "top" | "bottom" | "left" | "right" } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  if (!target || side === "center") {
    return {
      top: Math.max(pad, (vh - cardHeight) / 2),
      left: Math.max(pad, (vw - cardWidth) / 2),
    };
  }
  const t = target;
  switch (side) {
    case "right": {
      const left = t.left + t.width + pad;
      const top = clamp(t.top + t.height / 2 - cardHeight / 2, pad, vh - cardHeight - pad);
      return { top, left: Math.min(left, vw - cardWidth - pad), arrowSide: "left" };
    }
    case "left": {
      const left = t.left - cardWidth - pad;
      const top = clamp(t.top + t.height / 2 - cardHeight / 2, pad, vh - cardHeight - pad);
      return { top: Math.max(pad, top), left: Math.max(pad, left), arrowSide: "right" };
    }
    case "top": {
      const top = t.top - cardHeight - pad;
      const left = clamp(t.left + t.width / 2 - cardWidth / 2, pad, vw - cardWidth - pad);
      return { top: Math.max(pad, top), left, arrowSide: "bottom" };
    }
    case "bottom":
    default: {
      const top = t.top + t.height + pad;
      const left = clamp(t.left + t.width / 2 - cardWidth / 2, pad, vw - cardWidth - pad);
      return { top: Math.min(top, vh - cardHeight - pad), left, arrowSide: "top" };
    }
  }
}

export function TourOverlay() {
  const tour = useTour();
  const router = useRouter();
  const step = tour.steps[tour.stepIndex];
  const [target, setTarget] = useState<Position | null>(null);

  // If the tour is OPEN and the current step requires a different path,
  // navigate to it. Critical: only do this when tour.open is true, not
  // when the overlay is just mounted-but-invisible, otherwise we'd hijack
  // the user away from any page that wasn't /landing.
  useEffect(() => {
    if (!tour.open) return;
    if (!step?.path) return;
    if (typeof window !== "undefined" && window.location.pathname !== step.path) {
      router.push(step.path);
    }
  }, [tour.open, step, router]);

  // After path change + a tick, look up the target and scroll into view
  useLayoutEffect(() => {
    if (!tour.open || !step) {
      setTarget(null);
      return;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      if (!step.selector) {
        setTarget(null);
        return;
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setTarget(null);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Re-measure after scroll completes
      window.setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setTarget({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        });
      }, 350);
    };

    // Wait one frame so the page has rendered
    const id = window.setTimeout(measure, 80);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [tour.open, tour.stepIndex, step]);

  if (!tour.open || !step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cardWidth = Math.min(420, vw - 32);
  const cardHeight = 360;
  const pad = 16;
  const cardPos = pickCardPosition(target, step.side ?? "bottom", cardWidth, cardHeight, pad);

  // Build the spotlight "hole": a div drawn on top of the backdrop with a bright ring.
  const ringInset = 8;
  const holeStyle = target
    ? {
        position: "fixed" as const,
        top: Math.max(target.top - ringInset, 4),
        left: Math.max(target.left - ringInset, 4),
        width: target.width + ringInset * 2,
        height: target.height + ringInset * 2,
        borderRadius: 16,
        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.78)",
        outline: "2px solid rgba(99, 102, 241, 0.95)",
        outlineOffset: 0,
        pointerEvents: "none" as const,
        zIndex: 60,
        transition: "top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease",
      }
    : null;

  const isLast = tour.stepIndex === tour.steps.length - 1;
  const isFirst = tour.stepIndex === 0;

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 70 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${tour.stepIndex + 1} of ${tour.steps.length}`}
    >
      {/* Backdrop with blur — only when no spotlight target (otherwise the
          shadow box on the hole provides the dimming). */}
      {!target && (
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          style={{ animation: "tour-fade-in 220ms ease-out" }}
        />
      )}

      {/* Spotlight ring (when target present) */}
      {holeStyle && <div style={holeStyle} />}

      {/* Floating card */}
      <div
        className="absolute rounded-2xl border border-slate-700/60 bg-slate-900/95 p-6 text-slate-100 shadow-2xl"
        style={{
          top: cardPos.top,
          left: cardPos.left,
          width: cardWidth,
          maxHeight: vh - 32,
          overflowY: "auto",
          animation: "tour-pop-in 240ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono uppercase tracking-wider">
            Step {tour.stepIndex + 1} of {tour.steps.length}
          </span>
          <button
            onClick={tour.skip}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            Skip Tour
          </button>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${((tour.stepIndex + 1) / tour.steps.length) * 100}%` }}
          />
        </div>

        <h3 className="mt-5 text-xl font-bold tracking-tight">{step.title}</h3>
        <div className="mt-3 text-sm leading-relaxed text-slate-300">{step.body}</div>

        {/* Step 13 — completion buttons */}
        {isLast && (
          <div className="mt-5 rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm">
            <div className="font-semibold text-emerald-300">Congratulations! 🎉</div>
            <ul className="mt-2 space-y-1 text-emerald-200/90">
              <li>✓ Logged in</li>
              <li>✓ Generated x402 payment</li>
              <li>✓ Completed Arc testnet settlement</li>
              <li>✓ Generated Arc Settlement Proof</li>
              <li>✓ Verified on ArcScan</li>
              <li>✓ Viewed protocol analytics</li>
            </ul>
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={tour.prev}
              disabled={isFirst}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={tour.pause}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              title="Pause the tour — you can resume from any Take-a-Tour button"
            >
              ⏸ Pause
            </button>
          </div>
          <div className="flex gap-2">
            {isLast ? (
              <>
                <Link
                  href="/creator"
                  onClick={tour.finish}
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Explore Dashboard →
                </Link>
                <button
                  onClick={tour.restart}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  Restart Tour
                </button>
              </>
            ) : (
              <button
                onClick={tour.next}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes tour-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tour-pop-in {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}