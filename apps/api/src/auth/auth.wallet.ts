/**
 * Wallet generation helper. Uses viem to create a real Ethereum keypair.
 *
 * NOT a NestJS Injectable — instantiated directly by the AuthController
 * because we don't need DI for this one-shot utility.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export interface GeneratedWallet {
  address: `0x${string}`;
  privateKey: `0x${string}`;
}

/**
 * Create a fresh Ethereum keypair. The private key is the single secret
 * the creator needs to import into MetaMask / any EVM wallet. The address
 * is where USDC will be credited on Arc testnet.
 */
export function generateEthereumWallet(): GeneratedWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
}
