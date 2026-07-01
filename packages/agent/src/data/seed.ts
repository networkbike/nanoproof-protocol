/**
 * Seed script — registers the demo creators + sources + wallets from
 * @nanoproof/agent/demo-sources via the live NanoProof API.
 *
 * Usage:
 *   pnpm --filter @nanoproof/agent seed              # seed against http://localhost:4000
 *   API_BASE_URL=https://api.staging.nanoproof.xyz pnpm --filter @nanoproof/agent seed
 *
 * Idempotent: re-running upserts.
 */

import { demoCreators, demoSources } from "../data/demo-sources.js";

const BASE = process.env.API_BASE_URL ?? "http://localhost:4000";
const NETWORK = "ARC_TESTNET";

interface CreatedCreator {
  id: string;
  username: string;
  name: string;
}

async function post<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    if (res.status === 409 && err.code === "NP_USERNAME_TAKEN") {
      return null as unknown as T; // already exists
    }
    throw new Error(`${path} ${res.status} ${err.code ?? ""} ${err.message ?? ""}`);
  }
  return (await res.json()) as T;
}

async function main() {
  console.log(`Seeding demo data against ${BASE}`);

  // 1. Creators.
  const creatorByUsername: Record<string, CreatedCreator> = {};
  for (const c of demoCreators) {
    const created = await post<CreatedCreator>(
      "/v1/creators",
      { name: c.name, username: c.username, email: c.email, bio: c.bio },
      `seed-creator-${c.username}`,
    ).catch((err) => {
      console.warn(`creator ${c.username} failed: ${(err as Error).message}`);
      return null;
    });
    if (created) {
      creatorByUsername[c.username] = created;
      console.log(`✓ creator ${c.username} (${created.id})`);
    } else {
      // Look up by username (idempotent retry).
      const res = await fetch(`${BASE}/v1/creators/${c.username}`);
      if (res.ok) {
        creatorByUsername[c.username] = (await res.json()) as CreatedCreator;
        console.log(`↻ creator ${c.username} already exists`);
      }
    }
  }

  // 2. Sources.
  for (const s of demoSources) {
    const creator = creatorByUsername[s.creatorUsername];
    if (!creator) {
      console.warn(`skipping source ${s.title} — creator ${s.creatorUsername} missing`);
      continue;
    }
    const created = await post(
      "/v1/sources",
      {
        creatorId: creator.id,
        url: s.url,
        title: s.title,
        description: s.description,
        citationPrice: s.citationPrice,
      },
      `seed-source-${slug(s.url)}`,
    ).catch((err) => {
      console.warn(`source ${s.title} failed: ${(err as Error).message}`);
      return null;
    });
    console.log(created ? `✓ source ${s.title}` : `↻ source ${s.title}`);
  }

  // 3. Wallets (placeholder Arc testnet addresses — these are the
  //    deterministic demo wallets, not user-owned).
  for (const c of demoCreators) {
    const creator = creatorByUsername[c.username];
    if (!creator) continue;
    const addr = placeholderAddress(c.username);
    const w = await post(
      "/v1/wallets",
      { creatorId: creator.id, address: addr, network: NETWORK, isPrimary: true, label: "primary" },
      `seed-wallet-${c.username}`,
    ).catch(() => null);
    console.log(w ? `✓ wallet ${c.username} ${addr.slice(0, 10)}…` : `↻ wallet ${c.username}`);
  }

  console.log("Seed complete.");
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 48);
}

function placeholderAddress(username: string): string {
  // Deterministic 40-hex placeholder, NOT a real key. Real verification
  // requires the creator to sign a fresh challenge.
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) | 0;
  const hex = h.toString(16).padStart(8, "0").repeat(5);
  return `0x${hex.padEnd(40, "0").slice(0, 40)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
