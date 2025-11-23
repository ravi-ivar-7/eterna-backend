import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

if (!process.env.WALLET_PRIVATE_KEY) {
  throw new Error('WALLET_PRIVATE_KEY environment variable is not set');
}

let walletKeypair: Keypair | null = null;

export function getWallet(): Keypair {
  if (walletKeypair) {
    return walletKeypair;
  }

  try {
    const privateKeyString = process.env.WALLET_PRIVATE_KEY!;

    let secretKey: Uint8Array;

    if (privateKeyString.startsWith('[')) {
      const parsed = JSON.parse(privateKeyString);
      secretKey = Uint8Array.from(parsed);
    } else {
      secretKey = bs58.decode(privateKeyString);
    }

    walletKeypair = Keypair.fromSecretKey(secretKey);

    console.log('Wallet loaded:', walletKeypair.publicKey.toString());

    return walletKeypair;
  } catch (error) {
    throw new Error(
      `Failed to load wallet from WALLET_PRIVATE_KEY: ${
        error instanceof Error ? error.message : 'Invalid format'
      }`
    );
  }
}

export function getWalletPublicKey(): string {
  return getWallet().publicKey.toString();
}
