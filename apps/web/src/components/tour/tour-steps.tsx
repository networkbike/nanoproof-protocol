/**
 * NanoProof guided tour — 13 steps across landing / sign-in / creator /
 * supporter / payments / history / dashboard.
 *
 * Steps are intentionally concise. The card body copy is plain text
 * (no JSX) so it's easy to scan and doesn't bloat the bundle.
 */
import type { TourStep } from "./tour-context";

export const tourSteps: TourStep[] = [
  // ─── 1. WELCOME ─────────────────────────────────────────────────────────
  {
    id: "welcome",
    title: "Welcome to NanoProof",
    body: (
      <>
        NanoProof is a creator payment protocol powered by <strong>x402</strong> that
        generates verifiable <strong>Arc Settlement Proofs</strong> after every payment.
        This 13-step tour will walk a Lepton judge through the full demo in
        under 3 minutes.
      </>
    ),
    path: "/landing",
    side: "center",
  },

  // ─── 2. LANDING PAGE ────────────────────────────────────────────────────
  {
    id: "landing",
    title: "Landing Page",
    body: (
      <>
        This page introduces NanoProof and explains how creators securely monetize
        premium content with on-chain USDC payments and tamper-evident proof.
        The sections in view cover the hero, the 8-step how-it-works, the
        protocol deep-dive (x402, EIP-3009, Arc, ArcScan), and the architecture
        diagram.
      </>
    ),
    selector: '[data-tour-id="landing-hero"]',
    path: "/landing",
    side: "bottom",
  },

  // ─── 3. SIGN IN ─────────────────────────────────────────────────────────
  {
    id: "signin",
    title: "Sign In with Email OTP",
    body: (
      <>
        NanoProof uses passwordless <strong>Email OTP</strong> authentication.
        Enter any email, receive a 6-digit code via real email (powered by
        Resend + your own <code>nanoproof.online</code> domain), and you're in.
        No passwords, no wallet popup — just email.
      </>
    ),
    selector: '[data-tour-id="signin-cta"]',
    path: "/sign-in",
    side: "bottom",
  },

  // ─── 4. ROLE SELECTION ──────────────────────────────────────────────────
  {
    id: "role",
    title: "Pick your role",
    body: (
      <>
        Every new user picks a role on first login:
        <br />
        <br />
        <strong>Creator</strong> — publishes premium resources, earns USDC when
        an agent cites them.
        <br />
        <br />
        <strong>Supporter</strong> — represents the paying side. In NanoProof,
        an AI agent is the canonical supporter, but a human can also hold this
        role to explore the protocol.
      </>
    ),
    selector: '[data-tour-id="role-step"]',
    path: "/sign-in",
    side: "top",
  },

  // ─── 5. CREATOR DASHBOARD ───────────────────────────────────────────────
  {
    id: "dashboard",
    title: "Creator Dashboard",
    body: (
      <>
        After onboarding, the creator lands here. The cards show:
        <br />
        <br />
        • <strong>Total revenue</strong> — settled USDC across all sources
        <br />
        • <strong>Unique supporters</strong> — distinct payer addresses
        <br />
        • <strong>Pending payments</strong> — awaiting settlement
        <br />
        • <strong>Average per payment</strong> — USDC per citation
        <br />
        <br />
        The activity feed at the bottom shows every new settlement + ArcScan
        verification in real time.
      </>
    ),
    selector: '[data-tour-id="creator-kpis"]',
    path: "/creator",
    side: "bottom",
  },

  // ─── 6. CREATE RESOURCE ─────────────────────────────────────────────────
  {
    id: "create",
    title: "Create a premium resource",
    body: (
      <>
        On the payments page, click <strong>Start x402 flow</strong>. This generates
        a fresh payment request for a creator resource (default: the
        <code>/v1/research/cite</code> endpoint) priced at $0.001 in atomic USDC.
        Creators publish premium resources protected by x402 payments.
      </>
    ),
    selector: '[data-tour-id="payments-form"]',
    path: "/payments",
    side: "right",
  },

  // ─── 7. SUPPORTER DASHBOARD ─────────────────────────────────────────────
  {
    id: "supporter",
    title: "Supporter Dashboard",
    body: (
      <>
        Supporters purchase premium content from creators. Their dashboard shows
        total spend, payments made, creators they've tipped, protocol stats,
        and a recent-activity feed. Switch roles anytime from the sign-in flow.
      </>
    ),
    selector: '[data-tour-id="supporter-kpis"]',
    path: "/supporter",
    side: "bottom",
  },

  // ─── 8. x402 PAYMENT ────────────────────────────────────────────────────
  {
    id: "x402-payment",
    title: "x402 Payment Request",
    body: (
      <>
        When you click Start x402 flow, the api creates a payment challenge:
        <br />
        <br />
        • <strong>scheme:</strong> <code>exact</code>
        <br />
        • <strong>network:</strong> <code>eip155:5042002</code> (Arc testnet)
        <br />
        • <strong>payTo:</strong> the creator's wallet address
        <br />
        • <strong>asset:</strong> <code>0x36…0000</code> (USDC on Arc)
        <br />
        • <strong>maxAmountRequired:</strong> the per-citation price
        <br />
        <br />
        x402 standardizes this request so any HTTP 402-aware client (browser,
        agent, server) can handle it uniformly.
      </>
    ),
    selector: '[data-tour-id="x402-challenge"]',
    path: "/payments",
    side: "left",
  },

  // ─── 9. SETTLEMENT ──────────────────────────────────────────────────────
  {
    id: "settlement",
    title: "Auto Settlement",
    body: (
      <>
        After the client signs the EIP-3009 <code>transferWithAuthorization</code>,
        NanoProof automatically settles the transaction on Arc testnet. The
        USDC moves from the payer to the creator's wallet in a single atomic
        call. No custodian in the middle — funds flow directly to the creator.
      </>
    ),
    selector: '[data-tour-id="settlement-progress"]',
    path: "/payments",
    side: "top",
  },

  // ─── 10. ARC SETTLEMENT PROOF ──────────────────────────────────────────
  {
    id: "proof",
    title: "Arc Settlement Proof",
    body: (
      <>
        After settlement, NanoProof generates a cryptographic proof of
        payment:
        <br />
        <br />
        • <strong>paymentHash</strong> — EIP-712 digest of the authorization
        <br />
        • <strong>txHash</strong> — the on-chain Arc transaction hash
        <br />
        • <strong>blockNumber</strong> — the Arc block that confirmed it
        <br />
        • <strong>arcScanUrl</strong> — the public explorer link
        <br />
        • <strong>prevHash → hash</strong> — chained to the previous proof
        <br />
        <br />
        This proof is what makes NanoProof different from a normal payment
        rail — it's tamper-evident and chain-anchored.
      </>
    ),
    selector: '[data-tour-id="latest-settlement"]',
    path: "/payments",
    side: "left",
  },

  // ─── 11. ARCSCAN VERIFICATION ───────────────────────────────────────────
  {
    id: "arcscan",
    title: "ArcScan Verification",
    body: (
      <>
        Anyone can independently verify this settlement proof. The api calls
        ArcScan, confirms the transaction was mined on Arc, and tags the proof
        as <code>VERIFIED</code>. If the tx isn't found (wrong chain, not mined,
        insufficient confirmations) it's marked <code>FAILED</code> or
        <code>PENDING</code>. No trust assumption on NanoProof — verify on-chain.
      </>
    ),
    selector: '[data-tour-id="verify-button"]',
    path: "/history",
    side: "right",
  },

  // ─── 12. ANALYTICS ──────────────────────────────────────────────────────
  {
    id: "analytics",
    title: "Protocol Analytics",
    body: (
      <>
        The dashboard page surfaces protocol-wide analytics:
        <br />
        <br />
        • Total payments, settlements, verifications
        <br />
        • Total USDC distributed across all creators
        <br />
        • Top creators, top sources, top domains
        <br />
        • Timeline charts (citation + payment volume)
        <br />
        • Per-creator earnings breakdown
        <br />
        <br />
        All metrics update in real time as new settlements land.
      </>
    ),
    selector: '[data-tour-id="dashboard-protocol"]',
    path: "/dashboard",
    side: "bottom",
  },

  // ─── 13. COMPLETION ─────────────────────────────────────────────────────
  {
    id: "complete",
    title: "Demo complete!",
    body: (
      <>
        You've seen the full NanoProof workflow. Try it yourself:
        <br />
        <br />
        • Sign in with your own email → get a fresh wallet keypair
        <br />
        • Run the demo wizard → watch a full x402 lifecycle in 8s
        <br />
        • Import your key into MetaMask → see your USDC balance
        <br />
        <br />
        Everything you saw is live, real, and verifiable on ArcScan.
      </>
    ),
    path: "/landing",
    side: "center",
  },
];