import { useState, useEffect } from 'react';

interface WalletConnectionReturn {
  isWalletConnected: boolean | null;
  walletAddress: string | null;
  loading: boolean;
  setIsWalletConnected: React.Dispatch<React.SetStateAction<boolean | null>>;
  setWalletAddress: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useWalletConnection(token: string | null): WalletConnectionReturn {
  const [isWalletConnected, setIsWalletConnected] = useState<boolean | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const checkWalletConnection = async () => {
      try {
        const response = await fetch('/api/user/wallet', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsWalletConnected(!!data.walletAddress);
          setWalletAddress(data.walletAddress || null);
        } else {
          setIsWalletConnected(false);
          setWalletAddress(null);
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
        setIsWalletConnected(false);
        setWalletAddress(null);
      } finally {
        setLoading(false);
      }
    };

    checkWalletConnection();
  }, [token]);

  return { isWalletConnected, walletAddress, loading, setIsWalletConnected, setWalletAddress };
}
