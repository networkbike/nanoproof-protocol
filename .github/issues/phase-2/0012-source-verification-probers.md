---
id: P2-012
title: "[Phase 2] Implement Source verification probers (DNS / HTML / File)"
labels:
  - phase:phase-2
  - area:api
  - area:sources
  - area:security
  - priority:high
  - type:feature
priority: high
depends_on:
  - P2-011
estimate: L
---

# [Phase 2] Implement Source verification probers (DNS / HTML / File)

## Summary

Implement the three Source verification methods per [`docs/source-verification.md`](../../../docs/source-verification.md). The verification pipeline issues a challenge, the creator places the token out-of-band, then the server probes to confirm.

## Files to create

- `apps/api/src/sources/verification/challenge.service.ts`
- `apps/api/src/sources/verification/dns-prober.ts`
- `apps/api/src/sources/verification/html-prober.ts`
- `apps/api/src/sources/verification/file-prober.ts`
- `apps/api/src/sources/verification/verification.processor.ts` (BullMQ retry worker)
- `apps/api/src/sources/verification/sources-verification.controller.ts`
- `apps/api/src/sources/dto/issue-source-challenge.dto.ts`

## Acceptance criteria

- [ ] `POST /v1/sources/:id/challenge` issues a `VerificationChallenge` (`kind = 'source'`) with TTL per method.
- [ ] Challenge returns token + per-method instruction strings exactly as documented.
- [ ] `POST /v1/sources/:id/verify` runs the appropriate prober synchronously and returns 200/422.
- [ ] DNS prober uses `node:dns.promises.resolveTxt` with a 5s timeout.
- [ ] HTML prober fetches the URL, parses `<head>` with `cheerio`, matches `meta[name="nanoproof-verification"][content=token]`.
- [ ] File prober fetches `https://<domain>/.well-known/nanoproof-<token>.txt` and matches the body regex.
- [ ] SSRF defense: probers reject private IP ranges (RFC 1918, link-local, loopback).
- [ ] Retry policy implemented via BullMQ: DNS at 5s/30s/2m/10m/1h, HTML/file at 10s/1m/10m.
- [ ] On success: mark Source `ACTIVE`, mark challenge consumed, emit `source.verified`.
- [ ] On permanent failure: mark Source `REJECTED` with reason.
- [ ] Rate limit: 10 verify attempts / source / hour; 50 / IP / hour.
- [ ] Denylist of social platforms enforced at challenge-issue time (social-platform URLs require HTML meta on a custom domain).
- [ ] Integration tests for each prober + a happy-path end-to-end.

## Notes

- Reference: [`docs/source-verification.md`](../../../docs/source-verification.md).
- For DNS retries, use the existing BullMQ infra set up in P2-016.

## Dependencies

- P2-011 (Source CRUD)