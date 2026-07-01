/**
 * Demo dataset — 5 sources that map to the Lepton Demo MVP scenarios.
 *
 * Each entry is the canonical seed the research agent and the dashboard
 * both reference. The seed script (apps/api/prisma/seed.ts) ingests these
 * at db:seed time so the demo runs end-to-end with one `pnpm dev`.
 *
 * citationPrice is in atomic USDC (6 decimals). $0.001 = "1000".
 */

export interface DemoCreator {
  username: string;
  name: string;
  email: string;
  bio: string;
}

export interface DemoSource {
  title: string;
  url: string;
  description: string;
  author: string;
  creatorUsername: string;
  citationPrice: string;
  topic: "bitcoin-restaking" | "creator-economy" | "agent-payments" | "cross-chain";
  /** Cheap keyword hints used by the lightweight matcher. */
  keywords: string[];
}

export const demoCreators: DemoCreator[] = [
  {
    username: "satlayer-team",
    name: "SatLayer Team",
    email: "team@demo.nanoproof.xyz",
    bio: "Authors of the SatLayer restaking protocol. Writes technical explainers.",
  },
  {
    username: "babylon-labs",
    name: "Babylon Labs",
    email: "research@demo.nanoproof.xyz",
    bio: "Bitcoin staking protocol researchers. Source of canonical BTC restaking docs.",
  },
  {
    username: "arc-docs",
    name: "Arc Foundation",
    email: "arc@demo.nanoproof.xyz",
    bio: "Arc L1 — programmable USDC settlement chain. Official documentation.",
  },
  {
    username: "creator-econ-lab",
    name: "Creator Economy Lab",
    email: "lab@demo.nanoproof.xyz",
    bio: "Independent research lab publishing weekly essays on creator monetization.",
  },
  {
    username: "agent-foundry",
    name: "Agent Foundry",
    email: "foundry@demo.nanoproof.xyz",
    bio: "Builds reference implementations of payment-bearing AI agents.",
  },
];

export const demoSources: DemoSource[] = [
  {
    title: "Bitcoin Restaking: A Complete Guide",
    url: "https://docs.satlayer.xyz/guides/bitcoin-restaking",
    description:
      "Explains how Bitcoin L1 finality can secure additional services (AVS) without bridging BTC off-chain.",
    author: "SatLayer Team",
    creatorUsername: "satlayer-team",
    citationPrice: "1000",
    topic: "bitcoin-restaking",
    keywords: ["bitcoin", "restaking", "btc", "babylon", "satlayer", "avs", "finality", "stake"],
  },
  {
    title: "SatLayer Protocol Overview",
    url: "https://docs.satlayer.xyz/overview",
    description:
      "SatLayer builds a meta-layer for Bitcoin-secured services. Native BTC restaking + EVM execution.",
    author: "SatLayer Team",
    creatorUsername: "satlayer-team",
    citationPrice: "1000",
    topic: "bitcoin-restaking",
    keywords: ["satlayer", "bitcoin", "restaking", "meta-layer", "evm", "btc"],
  },
  {
    title: "Babylon Protocol Documentation",
    url: "https://docs.babylonlabs.io/intro",
    description:
      "Canonical source for Babylon's BTC staking protocol: timestamping, EOTS, finality providers.",
    author: "Babylon Labs",
    creatorUsername: "babylon-labs",
    citationPrice: "1000",
    topic: "bitcoin-restaking",
    keywords: ["babylon", "bitcoin", "staking", "eots", "finality", "timestamp", "btc"],
  },
  {
    title: "Arc L1 — Programmable USDC Settlement",
    url: "https://docs.arc.io/arc",
    description:
      "Arc is a purpose-built L1 for USDC-denominated apps. Native stablecoin gas, sub-cent fees.",
    author: "Arc Foundation",
    creatorUsername: "arc-docs",
    citationPrice: "1000",
    topic: "agent-payments",
    keywords: ["arc", "usdc", "settlement", "stablecoin", "l1", "circle", "fees", "stablecoin gas"],
  },
  {
    title: "The Creator Compensation Stack (2026)",
    url: "https://creatorconomy.lab/compensation-stack",
    description:
      "Why per-piece citation pricing finally beats the ad-driven creator economy. Covers stablecoin rails.",
    author: "Creator Economy Lab",
    creatorUsername: "creator-econ-lab",
    citationPrice: "1000",
    topic: "creator-economy",
    keywords: ["creator", "compensation", "citation", "stablecoin", "monetization", "ad", "web"],
  },
];
