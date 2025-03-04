import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Box, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: '#fff',
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '0.8rem'
      }}
    >
      <AccountBalanceWalletIcon sx={{ color: '#92E643' }} />
      <Typography sx={{ color: '#fff' }}>
        {wallet.connected ? (
          `${solBalance.toFixed(4)} SOL`
        ) : (
          'Not Connected'
        )}
      </Typography>
    </Box>
  );
};

export default UserBalance;