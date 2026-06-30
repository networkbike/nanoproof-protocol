# `@nanoproof/web`

Next.js 15 dashboard + simulator for the NanoProof Protocol.

## Quickstart

```bash
cp .env.example .env       # defaults assume api on :4000
pnpm dev                   # http://localhost:3000
```

## Pages

| Path              | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `/`               | Landing page with three pillars                        |
| `/dashboard`      | Server-rendered creator dashboard (sources + payments)|
| `/simulate`       | Client-side form: simulate a citation + payment       |
| `/api-keys`       | Mint + list API keys (Phase 2 P2-013 wires real auth) |

## Layout

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          Global layout + nav
│   │   ├── page.tsx            Landing
│   │   ├── globals.css         Tailwind 4 theme tokens
│   │   ├── dashboard/page.tsx  Server component, fetches /v1/*
│   │   ├── simulate/page.tsx   Client form, posts to /v1/*/simulate
│   │   └── api-keys/page.tsx   Phase-2 stub
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx      shadcn-style variant Button
│   │       └── card.tsx
│   └── lib/
│       ├── api.ts              Fetch wrapper (sends bearer + JSON)
│       └── utils.ts            cn() + atomicUsdc → USD formatter
└── public/
```

## Talking to the API

- **Server components**: `fetch(${process.env.NEXT_PUBLIC_API_URL}/v1/...)` with `cache: "no-store"`.
- **Client components**: `import { api } from "@/lib/api"` — handles JSON + bearer auth.

Both go through the API at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`).

## Phase 2 upgrades

- Wire Clerk auth into `app/layout.tsx` + middleware
- Replace the placeholder `/api-keys` page with the real mint flow
- Add `/dashboard/[creatorId]` for public creator profiles
- Add `<Provider>` for React Query hydration

## Conventions

- Server components by default. Add `"use client"` only when you need state / effects.
- Tailwind 4 — tokens in `globals.css` via `@theme {}`.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Use `formatUsd()` (in `@/lib/utils`) for any USDC display.