# Creator Onboarding

> For creators who want to start receiving nanopayments when AI agents cite their work.

---

## What you'll need

- An Arc-compatible wallet (e.g. Rainbow, MetaMask with Arc network added).
- A piece of content you want to monetize (article, paper, image, dataset, code repo).
- ~5 minutes.

---

## Steps

### 1. Sign up at nanoproof.xyz

Use Clerk to sign in — email, passkey, or social login.

### 2. Connect your payout wallet

Open `/dashboard/settings/payout`. Connect an Arc wallet. This is where citations will pay out in USDC. NanoProof is **non-custodial** — we never hold your funds.

### 3. Register your first source

Open `/dashboard/sources/new` and submit:
- The **canonical URL** of your work.
- The **license** (e.g. CC-BY, all-rights-reserved).
- An optional **per-citation price** (default $0.001).

The system computes a SHA-256 fingerprint of the content and stores it onchain as part of your registration.

### 4. Configure pricing + splits

In `/dashboard/settings/pricing`:
- Set a base per-citation price.
- Optionally add **co-author splits** (e.g. 70% you, 30% co-author) — payouts are auto-distributed.

### 5. Wait for citations

Once any agent that uses NanoProof cites your work, you'll see:
- A real-time citation event in the dashboard.
- A USDC transfer to your wallet (settled on Arc in <2s).
- An ArcScan-verifiable txHash as your receipt.

---

## Best practices

- **Set a reasonable per-citation price.** $0.001 is a good default. Adjust based on your audience size and the value of the citation to the agent's user.
- **Use royalty splits if you have co-authors.** NanoProof handles the distribution atomically.
- **Add a creator-badge script to your site** (coming in Phase 4) so agents can detect your content as a registered Source even when not explicitly linked.
- **Periodically audit your citations.** The dashboard shows you every AI response that cited you and the exact snippet used.

---

## See also

- [`../../README.md`](../../README.md)
- [`../protocol-spec.md`](../protocol-spec.md#31-creator)