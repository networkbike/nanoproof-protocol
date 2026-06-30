# `vaults/` — Creator Vault Management

> Owns the Creator vault lifecycle: creation, verification delegation, splits, migration.

## Files

| File | Responsibility |
|------|----------------|
| `vault-manager.ts` | `VaultManager` top-level. CRUD + pause + resume + migrate. |
| `splits-validator.ts` | Validate split basisPoints sum + wallet uniqueness. |
| `contract-screener.ts` | Screen programmable vault contracts against denylist. |
| `multisig-verifier.ts` | Verify Safe `owners()` includes the Creator's wallet. |
| `migrator.ts` | Old-vault → new-vault migration logic. |
| `denylist.ts` | Known-malicious contract addresses (loaded from config). |

## Public API

```typescript
export interface VaultManager {
  create(req: CreateVaultRequest): Promise<Vault>;
  update(id: string, req: UpdateVaultRequest): Promise<Vault>;
  pause(id: string, reason: string): Promise<Vault>;
  resume(id: string): Promise<Vault>;
  migrate(id: string, newWalletId: string): Promise<{ old: Vault; new: Vault }>;
  get(id: string): Promise<Vault>;
  list(req: ListVaultsRequest): Promise<Vault[]>;
  balance(id: string): Promise<VaultBalance>;
}

export interface SplitsValidator {
  validate(splits: Split[]): { ok: true } | { ok: false; reason: string };
}

export interface ContractScreener {
  screen(address: Address, network: WalletNetwork): Promise<{ ok: true } | { ok: false; reason: 'DENYLISTED' | 'NOT_CONTRACT' | 'INVALID_ABI' }>;
}
```

## Vault lifecycle

```
DRAFT (verification in progress) → VERIFIED → ACTIVE
                                       │
                                       ↓ (pause)
                                    PAUSED
                                       │
                                       ↓ (resume)
                                    ACTIVE
                                       │
                                       ↓ (migrate)
                                    RETIRED
```

## See also

- [`docs/creator-vaults.md`](../../../docs/creator-vaults.md)
- [`docs/wallet-verification.md`](../../../docs/wallet-verification.md)
- [`../core/`](../core/README.md)