'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import bs58 from 'bs58';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const WalletDisconnectButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
);

const WalletModalButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletModalButton,
  { ssr: false }
);

interface WalletConnectProps {
  token: string;
  onWalletConnected: () => void;
}

export default function WalletConnect({ token, onWalletConnected }: WalletConnectProps) {
  const { publicKey, signMessage, connected, disconnect, wallet, select } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResetWallet = () => {
    select(null as any);
    setError('');
  };

  const handleChangeWallet = async () => {
    try {
      await disconnect();
      setError('');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleConnectWallet = async () => {
    if (!publicKey || !signMessage) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const message = `Connect wallet to Eterna`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          signature: bs58.encode(signature),
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect wallet');
      }

      onWalletConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-sm text-gray-600">
            Connect your Solana wallet to start trading
          </p>
        </div>

        <div className="space-y-4">
          {mounted && !connected && !wallet && (
            <div className="flex justify-center">
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !py-3 !px-6" />
            </div>
          )}

          {mounted && !connected && wallet && (
            <div className="space-y-3">
              <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-sm text-amber-900 text-center">
                  <div className="font-medium mb-1">{wallet.adapter.name} selected</div>
                  <div className="text-xs text-amber-700">Click connect to approve in your wallet</div>
                </div>
              </div>

              <div className="flex gap-2">
                <WalletMultiButton className="flex-1 !bg-blue-600 hover:!bg-blue-700 !py-3" />
                <button
                  onClick={handleResetWallet}
                  className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {mounted && connected && (
            <>
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-900">
                  <div className="font-medium text-center mb-1">{wallet?.adapter.name} Connected</div>
                  <div className="text-xs text-green-700 font-mono text-center">
                    {publicKey?.toString().slice(0, 16)}...{publicKey?.toString().slice(-12)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <WalletModalButton className="flex-1 !bg-gray-600 hover:!bg-gray-700 !text-sm !py-2">
                  Change Wallet
                </WalletModalButton>

                <button
                  onClick={handleChangeWallet}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>

              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Verify & Connect Wallet'}
              </button>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Don't have a Solana wallet?
            </h3>
            <p className="text-xs text-blue-700 mb-2">
              Install one of these browser extensions:
            </p>
            <div className="space-y-2">
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-800 underline"
              >
                → Download Phantom Wallet (Recommended)
              </a>
              <a
                href="https://solflare.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-800 underline"
              >
                → Download Solflare Wallet
              </a>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              After installing, refresh this page and click "Select Wallet"
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-amber-900 mb-2">
              Important: Switch to Devnet
            </h3>
            <p className="text-xs text-amber-700">
              After connecting your wallet, switch it to <strong>Devnet</strong> in wallet settings to use test tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
