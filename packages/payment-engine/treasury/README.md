# `treasury/` — Treasury Management

> Protocol treasury, hot wallet, cold storage, fee accrual, withdrawals.

## Files

| File | Responsibility |
|------|----------------|
| `treasury-manager.ts` | Top-level Treasury CRUD + transaction ledger. |
| `fee-accruer.ts` | Process fee accrual on every settled PaymentIntent. |
| `hot-wallet.ts` | Hot wallet state + balance + drain protection. |
| `refill-scheduler.ts` | Auto-refill hot wallet from treasury when below threshold. |
| `cold-storage.ts` | Cold storage management (multisig-only). |
| `withdrawal-manager.ts` | Multisig withdrawal flow. |
| `balance-reader.ts` | Read onchain balances via Arc RPC. |
| `policy.ts` | Loads treasury policy version from env. |

## Public API

```typescript
export interface TreasuryManager {
  getState(): Promise<Treasury>;
  getBalance(): Promise<TreasuryBalance>;
  getTransactions(req: ListTxRequest): Promise<TreasuryTransaction[]>;
  initiateWithdrawal(req: CreateWithdrawalRequest): Promise<TreasuryWithdrawal>;
  signWithdrawal(id: string, signature: string): Promise<TreasuryWithdrawal>;
  executeWithdrawal(id: string): Promise<TreasuryWithdrawal>;
}

export interface HotWallet {
  getState(): Promise<HotWalletState>;
  refill(): Promise<TreasuryTransaction>;
  getDailyUsage(): Promise<bigint>;
}

export interface FeeAccruer {
  accrue(paymentIntent: PaymentIntent, receipt: Receipt): Promise<TreasuryTransaction>;
}
```

## Fee accrual flow

```
1. PaymentIntent settles → Receipt created
2. FeeAccruer.accrue(intent, receipt)
3. Compute feeAtomic from totalAtomic × feeBps
4. Build TreasuryTransaction(type=FEE_ACCRUAL, amount=feeAtomic)
5. Persist + emit event
6. Indexer updates analytics
```

## Withdrawal flow

```
1. Operator POSTs /v1/treasury/withdrawals
2. WithdrawalManager.initiate → create PENDING withdrawal
3. Other operators review + sign
4. When threshold reached, WithdrawalManager.execute → Safe tx
5. TreasuryTransaction(type=WITHDRAWAL) persisted
6. Public dashboard reflects
```

## See also

- [`docs/treasury-management.md`](../../../docs/treasury-management.md)
- [`../core/`](../core/README.md)
- [`../fees/`](../fees/README.md)