/**
 * x402 protocol constants — NanoProof Protocol, Phase 8.
 *
 * x402 is Coinbase's open standard for HTTP 402 Payment Required.
 * Spec: https://www.x402.org/
 *
 * We pay USDC on Arc (Circle's stablecoin-native L1) via EIP-3009
 * transferWithAuthorization. Arc uses USDC as the native gas token
 * (no volatile ETH). Finality is deterministic BFT (1 confirmation
 * is final — no reorgs).
 *
 * See:
 *   docs/X402_IMPLEMENTATION.md  — what each field means
 *   docs/PAYMENT_FLOW.md         — full request lifecycle
 *   docs/ARC_SETTLEMENT.md       — settlement + verification
 */

// -----------------------------------------------------------------------------
// Arc testnet (chain id 5042002)
// -----------------------------------------------------------------------------

export const ARC_TESTNET = {
  chainId: 5042002,
  /** JSON-RPC endpoint */
  rpcUrl: "https://rpc.testnet.arc.network",
  /** WebSocket endpoint */
  wssUrl: "wss://rpc.testnet.arc.network",
  /** Block explorer */
  explorerUrl: "https://testnet.arcscan.app",
  /** Blockscout v2 API for ArcScan verification */
  arcscanApiUrl: "https://testnet.arcscan.app/api/v2",
  /** Native currency is USDC, but the ERC-20 interface lives here */
  usdcAddress: "0x3600000000000000000000000000000000000000",
  /** USDC has 6 decimals on the ERC-20 interface */
  usdcDecimals: 6,
  /** CCTP domain */
  cctpDomain: 26,
} as const;

// -----------------------------------------------------------------------------
// x402 protocol constants
// -----------------------------------------------------------------------------

/** x402 protocol version we implement */
export const X402_VERSION = 1;

/** Payment scheme (fixed-amount transfers). Future: "upto" for consumption-based */
export const X402_SCHEME = "exact" as const;

/** CAIP-2 network identifier for Arc testnet (EVM-style) */
export const X402_NETWORK = "eip155:5042002" as const;

/** USDC asset identifier on Arc testnet (CAIP-19 style) */
export const X402_ASSET = `eip155:5042002/erc20:${ARC_TESTNET.usdcAddress}` as const;

// -----------------------------------------------------------------------------
// HTTP headers (x402 spec)
// -----------------------------------------------------------------------------

/** Server -> Client: base64-encoded payment requirements (the 402 challenge) */
export const HEADER_PAYMENT_REQUIRED = "payment-required";
/** Server -> Client (legacy): some implementations use the capitalised form */
export const HEADER_PAYMENT_REQUIRED_UPPER = "PAYMENT-REQUIRED";
/** Client -> Server: base64-encoded signed payment payload */
export const HEADER_PAYMENT_SIGNATURE = "payment-signature";
/** Client -> Server (legacy) */
export const HEADER_PAYMENT_SIGNATURE_UPPER = "PAYMENT-SIGNATURE";
/** Server -> Client: settlement confirmation after success */
export const HEADER_PAYMENT_RESPONSE = "payment-response";
/** Server -> Client (legacy) */
export const HEADER_PAYMENT_RESPONSE_UPPER = "PAYMENT-RESPONSE";

// -----------------------------------------------------------------------------
// Pricing (demo defaults)
// -----------------------------------------------------------------------------

/** Default creator wallet (used when the creator has no registered wallet) */
export const DEFAULT_CREATOR_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
/** Default facilitator address (NanoProof facilitator — demo = zero address) */
export const DEFAULT_FACILITATOR = "0x0000000000000000000000000000000000000000";
/** Default AI-agent payer address used in demo mode */
export const DEFAULT_PAYER_AGENT = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

/** Default per-call x402 price (in atomic USDC, $0.001 = 1000 atomic) */
export const DEFAULT_X402_PRICE_ATOMIC = "1000";

/** Default payment validity window (60 seconds per x402 spec) */
export const DEFAULT_VALIDITY_SECONDS = 60;

/** Per-resource price catalog (in atomic USDC) */
export const PRICE_CATALOG: Record<string, string> = {
  "/v1/research/answer": "10000", // $0.01 — full research query
  "/v1/research/cite": "1000", // $0.001 — single citation lookup
  "/v1/premium/source": "5000", // $0.005 — premium source access
  "/v1/agent/tool": "2500", // $0.0025 — agent tool call
};

/** Default explorer link template */
export function arcScanTxUrl(txHash: string): string {
  return `${ARC_TESTNET.explorerUrl}/tx/${txHash}`;
}

export function arcScanAddressUrl(address: string): string {
  return `${ARC_TESTNET.explorerUrl}/address/${address}`;
}