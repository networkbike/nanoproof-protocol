/**
 * ArcScan Verifier — verifies a SettlementProof's txHash against the
 * Arc testnet block explorer API.
 *
 * ArcScan is a Blockscout v2 deployment. Endpoint shape:
 *
 *   GET https://testnet.arcscan.app/api/v2/transactions/{txHash}
 *
 * Returns 200 with a Transaction object on success, 404 if not indexed
 * yet. We treat 404 as PENDING (re-check) and 200 with status=0 as FAILED.
 *
 * Arc has deterministic BFT finality — 1 confirmation is final — so we
 * treat any mined tx with status=1 as VERIFIED.
 *
 * In DEMO mode (NANOPROOF_DEMO_MODE=true) we synthesise a realistic
 * verification response without making the network call.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  ARC_TESTNET,
  arcScanTxUrl,
} from "./x402.constants.js";

export interface ArcScanTxStatus {
  /** Whether the tx is found and mined. */
  found: boolean;
  /** Onchain success (status=1) or failure (status=0). */
  success: boolean | null;
  /** Number of block confirmations. Arc needs only 1. */
  confirmations: number;
  /** Block number (null if not mined). */
  blockNumber: string | null;
  /** Unix timestamp of the block. */
  blockTimestamp: string | null;
  /** From / to addresses from the tx. */
  from: string | null;
  to: string | null;
  /** Method called (e.g. "transfer" for ERC-20). */
  method: string | null;
  /** ArcScan explorer URL. */
  explorerUrl: string;
  /** ISO timestamp when we checked. */
  checkedAt: string;
  /** Error message if the verification call failed. */
  error?: string;
  /** Source identifier: ARCSCAN (live) | SYNTHETIC (demo). */
  source: "ARCSCAN" | "SYNTHETIC";
}

@Injectable()
export class ArcScanVerifierService {
  private readonly logger = new Logger(ArcScanVerifierService.name);
  /** Cache txHash -> status for 30s to avoid hammering ArcScan. */
  private readonly cache = new Map<string, { at: number; status: ArcScanTxStatus }>();
  private readonly cacheTtlMs = 30_000;

  /**
   * Verify a txHash against ArcScan. Returns a normalised status
   * object suitable for direct storage or return to clients.
   *
   * @param txHash        0x-prefixed transaction hash
   * @param demoExpected  if provided AND demo mode is on, synthesize
   *                      a verification response based on this expected
   *                      payload (used by the demo settlement flow)
   */
  async verify(txHash: string, demoExpected?: {
    blockNumber: bigint;
    from: string;
    to: string;
    valueAtomic: string;
    settledAt: Date;
  }): Promise<ArcScanTxStatus> {
    const cached = this.cache.get(txHash);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) {
      return cached.status;
    }

    // Demo mode: synthesise a realistic verified response without hitting ArcScan
    if (process.env.NANOPROOF_DEMO_MODE === "true" && demoExpected) {
      const status: ArcScanTxStatus = {
        found: true,
        success: true,
        confirmations: 1,
        blockNumber: demoExpected.blockNumber.toString(),
        blockTimestamp: demoExpected.settledAt.toISOString(),
        from: demoExpected.from,
        to: demoExpected.to,
        method: "transfer",
        explorerUrl: arcScanTxUrl(txHash),
        checkedAt: new Date().toISOString(),
        source: "SYNTHETIC",
      };
      this.cache.set(txHash, { at: Date.now(), status });
      return status;
    }

    // Live verification — call ArcScan Blockscout v2 API
    try {
      const url = `${ARC_TESTNET.arcscanApiUrl}/transactions/${txHash}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);
      const resp = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (resp.status === 404) {
        const status: ArcScanTxStatus = {
          found: false,
          success: null,
          confirmations: 0,
          blockNumber: null,
          blockTimestamp: null,
          from: null,
          to: null,
          method: null,
          explorerUrl: arcScanTxUrl(txHash),
          checkedAt: new Date().toISOString(),
          error: "tx not yet indexed",
          source: "ARCSCAN",
        };
        this.cache.set(txHash, { at: Date.now(), status });
        return status;
      }

      if (!resp.ok) {
        return {
          found: false,
          success: null,
          confirmations: 0,
          blockNumber: null,
          blockTimestamp: null,
          from: null,
          to: null,
          method: null,
          explorerUrl: arcScanTxUrl(txHash),
          checkedAt: new Date().toISOString(),
          error: `ArcScan returned HTTP ${resp.status}`,
          source: "ARCSCAN",
        };
      }

      const body = (await resp.json()) as Record<string, unknown>;
      const status: ArcScanTxStatus = {
        found: true,
        success: body.status === "ok" || body.result === "success" || body.status === "1",
        confirmations: Number(body.confirmations ?? 1),
        blockNumber: body.block_number != null ? String(body.block_number) : null,
        blockTimestamp: body.timestamp != null ? new Date(String(body.timestamp)).toISOString() : null,
        from: (body.from as { hash?: string } | undefined)?.hash ?? (body.from as string | undefined) ?? null,
        to: (body.to as { hash?: string } | undefined)?.hash ?? (body.to as string | undefined) ?? null,
        method: (body.method as string | undefined) ?? null,
        explorerUrl: arcScanTxUrl(txHash),
        checkedAt: new Date().toISOString(),
        source: "ARCSCAN",
      };
      this.cache.set(txHash, { at: Date.now(), status });
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`ArcScan verification failed for ${txHash}: ${message}`);
      return {
        found: false,
        success: null,
        confirmations: 0,
        blockNumber: null,
        blockTimestamp: null,
        from: null,
        to: null,
        method: null,
        explorerUrl: arcScanTxUrl(txHash),
        checkedAt: new Date().toISOString(),
        error: message,
        source: "ARCSCAN",
      };
    }
  }
}