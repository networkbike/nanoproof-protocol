"use client";

import * as React from "react";



/**
 * VerificationBadge — small pill showing the verification status of a
 * SettlementProof. Color-coded: emerald (verified), amber (pending),
 * red (failed), slate (inconclusive).
 */

import { Badge } from "../ui/badge";

export function VerificationBadge({
  status,
  className,
}: {
  status: "VERIFIED" | "PENDING" | "FAILED" | "INCONCLUSIVE" | string;
  className?: string;
}): React.ReactElement {
  if (status === "VERIFIED") {
    return (
      <Badge variant="outline" className={`border-emerald-500/40 text-emerald-300 bg-emerald-500/10 ${className ?? ""}`}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
        Verified on ArcScan
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="outline" className={`border-red-500/40 text-red-300 bg-red-500/10 ${className ?? ""}`}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5" />
        Verification failed
      </Badge>
    );
  }
  if (status === "INCONCLUSIVE") {
    return (
      <Badge variant="outline" className={`border-slate-500/40 text-slate-300 bg-slate-500/10 ${className ?? ""}`}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
        Inconclusive
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`border-amber-500/40 text-amber-300 bg-amber-500/10 ${className ?? ""}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
      Verifying…
    </Badge>
  );
}