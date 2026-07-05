"use client";

/**
 * Tour context — state + actions for the NanoProof guided tour.
 *
 * Persists completion in localStorage under the `nanoproof-tour` key so
 * the tour does NOT auto-show on subsequent visits. Judges / users can
 * always re-trigger via the "Take a Tour" button.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface TourStep {
  /** Stable id used by localStorage + analytics. */
  id: string;
  /** Title shown at the top of the overlay card. */
  title: string;
  /** Body copy explaining this step. Plain text or simple HTML. */
  body: React.ReactNode;
  /** Optional CSS selector to highlight (spotlight + scroll into view). */
  selector?: string;
  /** If the step needs a different route, navigate here before highlighting. */
  path?: string;
  /** Where to position the overlay relative to the spotlight element. */
  side?: "top" | "bottom" | "left" | "right" | "center";
}

interface TourState {
  open: boolean;
  stepIndex: number;
  steps: TourStep[];
  started: boolean;
  paused: boolean;
}

interface TourContextValue extends TourState {
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  goTo: (index: number) => void;
  isCompleted: () => boolean;
  resetCompletion: () => void;
}

const TourCtx = createContext<TourContextValue | null>(null);

const STORAGE_KEY = "nanoproof-tour";
const AUTO_KEY = "nanoproof-tour-auto-shown";

export function TourProvider({
  children,
  steps,
}: {
  children: React.ReactNode;
  steps: TourStep[];
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Track completion persistently
  const [completed, setCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "completed";
    } catch {
      return false;
    }
  });

  // Auto-launch on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const alreadyShown = localStorage.getItem(AUTO_KEY);
      if (!alreadyShown && !completed) {
        // Slight delay so the page renders first
        const t = window.setTimeout(() => {
          setOpen(true);
          setStarted(true);
          setStepIndex(0);
          localStorage.setItem(AUTO_KEY, "shown");
        }, 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [completed]);

  // Listen for global "open tour" events (e.g. "Take a Tour" button click)
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setStarted(true);
      setStepIndex(0);
      setPaused(false);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("nanoproof:open-tour", handler);
      return () => window.removeEventListener("nanoproof:open-tour", handler);
    }
  }, []);

  const start = useCallback(() => {
    setOpen(true);
    setStarted(true);
    setStepIndex(0);
    setPaused(false);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        // Last step → finish
        setOpen(false);
        setCompleted(true);
        try {
          localStorage.setItem(STORAGE_KEY, "completed");
        } catch {
          /* ignore */
        }
        return i;
      }
      return i + 1;
    });
  }, [steps.length]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    setOpen(false);
    setCompleted(true);
    try {
      localStorage.setItem(STORAGE_KEY, "completed");
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    setCompleted(true);
    try {
      localStorage.setItem(STORAGE_KEY, "completed");
    } catch {
      /* ignore */
    }
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  const restart = useCallback(() => {
    setOpen(true);
    setStarted(true);
    setStepIndex(0);
    setPaused(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const goTo = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, index)));
  }, [steps.length]);

  const isCompleted = useCallback(() => completed, [completed]);

  const resetCompletion = useCallback(() => {
    setCompleted(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTO_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value: TourContextValue = {
    open: open && !paused,
    stepIndex,
    steps,
    started,
    paused,
    start,
    next,
    prev,
    skip,
    finish,
    pause,
    resume,
    restart,
    goTo,
    isCompleted,
    resetCompletion,
  };

  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourCtx);
  if (!ctx) {
    throw new Error("useTour must be used within a <TourProvider>");
  }
  return ctx;
}

/** Helper: open the tour programmatically (used by "Take a Tour" buttons) */
export function openTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nanoproof:open-tour"));
  }
}