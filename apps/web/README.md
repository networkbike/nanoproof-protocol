# NanoProof Web (`apps/web`)

> Creator dashboards, agent developer portal, public analytics site, and marketing front door.

[![Stack: Next.js 15](https://img.shields.io/badge/Next.js-15-000000.svg)](https://nextjs.org)
[![Stack: TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://typescriptlang.org)
[![Stack: TailwindCSS 4](https://img.shields.io/badge/TailwindCSS-4-06B6D4.svg)](https://tailwindcss.com)
[![Stack: shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-000000.svg)](https://ui.shadcn.com)

---

## Overview

The web app is the public surface of NanoProof. It's built with **Next.js 15** using the App Router, **TypeScript** strict mode, **TailwindCSS 4**, and **shadcn/ui** primitives.

It hosts four distinct surfaces:

| Route group | Purpose |
|-------------|---------|
| `/` | Marketing site + docs landing |
| `/dashboard` | Creator dashboard (sources, earnings, citations) |
| `/developers` | Agent developer portal (API keys, snippets, metrics) |
| `/analytics` | Public analytics (transparent citation + payment ledger) |

---

## Architecture

```
apps/web/
├── app/
│   ├── (marketing)/          # static + RSC marketing pages
│   ├── (dashboard)/          # authenticated creator area
│   ├── (developers)/         # agent developer portal
│   ├── analytics/            # public analytics
│   ├── api/                  # route handlers (proxy only)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn primitives
│   ├── marketing/
│   ├── dashboard/
│   └── shared/
├── lib/
│   ├── api.ts                # typed NestJS client
│   ├── wallet.ts             # RainbowKit config
│   └── utils.ts
├── public/
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── README.md
```

---

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_NANOPROOF_API_URL` | NestJS API base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk server-side |
| `NEXT_PUBLIC_ARC_RPC_URL` | Arc testnet/mainnet RPC |
| `NEXT_PUBLIC_ARCSCAN_URL` | ArcScan base URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect |

---

## Local development

```bash
pnpm --filter @nanoproof/web dev
# → http://localhost:3000
```

---

## Conventions

- **App Router only.** No pages router.
- **Server Components by default.** `"use client"` only where needed.
- **shadcn primitives** — install via `pnpm dlx shadcn@latest add <component>`.
- **No business logic in components.** Mutations go through `lib/api.ts`.
- **TanStack Query** for client-side data fetching.

---

## Roadmap

See [`ROADMAP.md`](../../ROADMAP.md) for the build phases this app lands in (Phase 2, 4, 6, 9).

---

## License

MIT — see [`LICENSE`](../../LICENSE).