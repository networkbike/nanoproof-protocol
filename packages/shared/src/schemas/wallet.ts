import { z } from "zod";

export const WalletNetworkSchema = z.enum([
  "ARC_TESTNET",
  "ARC_MAINNET",
  "BASE",
  "BASE_SEPOLIA",
  "ETHEREUM",
  "ETHEREUM_SEPOLIA",
  "POLYGON",
  "POLYGON_AMOY",
]);
export type WalletNetwork = z.infer<typeof WalletNetworkSchema>;

export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
  .transform((a) => a.toLowerCase());

export const AttachWalletSchema = z.object({
  creatorId: z.string(),
  address: EthereumAddressSchema,
  network: WalletNetworkSchema,
  label: z.string().max(60).optional(),
  isPrimary: z.boolean().default(false),
});
export type AttachWallet = z.infer<typeof AttachWalletSchema>;

export const WalletSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  address: z.string(),
  network: WalletNetworkSchema,
  label: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  verificationStatus: z.string(),
  verifiedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Wallet = z.infer<typeof WalletSchema>;