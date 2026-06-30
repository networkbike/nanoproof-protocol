# `x402/` — x402 Protocol Integration

> Wraps every PaymentQuote in an x402 envelope. Standardizes the offchain auth layer for cross-protocol composition.

## Files

| File | Responsibility |
|------|----------------|
| `signer.ts` | Sign PaymentQuote → x402 envelope (EIP-712). |
| `validator.ts` | Validate inbound x402 envelopes. |
| `envelope.ts` | Envelope type definitions + canonical JSON. |
| `policy.ts` | Loads x402 policy version from env. |

## Public API

```typescript
export interface X402Signer {
  sign(quote: PaymentQuote): Promise<X402Envelope>;
  verify(envelope: X402Envelope): Promise<{ ok: boolean; recovered?: Address }>;
}

export type X402Envelope = {
  challenge: string;              // "HTTP 402 Payment Required"
  resource: string;               // nanoproof://payment-intents/<id>
  quote: PaymentQuote;
  payer: Address;
  payees: Address[];
  amount: string;                 // atomic USDC
  currency: "USDC";
  signature: `0x${string}`;
  validUntil: string;              // ISO
};
```

## Envelope construction

```typescript
const envelope: X402Envelope = {
  challenge: "HTTP 402 Payment Required",
  resource: `nanoproof://payment-intents/${quote.paymentIntentId}`,
  quote,
  payer: agentHotWalletAddress,
  payees: payouts.map(p => p.walletAddress),
  amount: totalAtomic,
  currency: "USDC",
  signature: eip712Sign(domain, types, value, privateKey),
  validUntil: quote.validUntil.toISOString(),
};
```

## Validation

```
1. envelope.signature recovers envelope.payer (EIP-712)
2. envelope.amount == envelope.quote.totalAtomic
3. envelope.payees ⊇ quote.payouts[].vaultAddress
4. envelope.validUntil > now
5. envelope.quote.policyVersion is supported
```

## See also

- [x402.org](https://www.x402.org/)
- [`docs/settlement-arc.md`](../../../docs/settlement-arc.md)
- [`../settlement/`](../settlement/README.md)