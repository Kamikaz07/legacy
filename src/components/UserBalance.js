import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const UserBalance = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [solBalance, setSolBalance] = useState(0);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setSolBalance(0);
      return;
    }

    const getSolBalance = async () => {
      try {
        const balance = await connection.getBalance(wallet.publicKey);
        setSolBalance(balance / 1e9); // Convert lamports to SOL
      } catch (error) {
        console.error('Error fetching SOL balance:', error);
        setSolBalance(0);
      }
    };

    getSolBalance();
  }, [wallet.connected, wallet.publicKey, connection]);

  return (
    <div>
      {wallet.connected ? (
        <div>
          <p>Connected to {wallet.wallet?.adapter?.name}</p>
          <p>SOL Balance: {solBalance}</p>
        </div>
      ) : (
        <p>Connect your wallet to view balances</p>
      )}
    </div>
  );
};

export default UserBalance;