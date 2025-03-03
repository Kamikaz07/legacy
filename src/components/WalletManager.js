import React, { useState } from 'react';
import axios from 'axios';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Paper, Box } from '@mui/material';
import { styled } from '@mui/system';

const ChaosPaper = styled(Paper)({ /* Same styling as CoinCreator */ });

const WalletManager = () => {
  const [wallets, setWallets] = useState([]);
  const [masterAddress] = useState('YOUR_TESTNET_MASTER_ADDRESS'); // Replace

  const generateWallets = async () => {
    const response = await axios.post('http://localhost:3001/api/generate-wallets');
    console.log('Wallet Keys:', response.data.wallets); // See all keys here
    setWallets(response.data.wallets);
  };

  const fundWallets = async () => {
    await axios.post('http://localhost:3001/api/fund-wallets', { masterAddress });
    const updatedWallets = await axios.get('http://localhost:3001/api/wallets');
    setWallets(updatedWallets.data.wallets);
  };

  const buyTokens = async () => {
    await axios.post('http://localhost:3001/api/buy-tokens', { tokenAddress: 'YOUR_TOKEN_ADDRESS' }); // Replace
    const updatedWallets = await axios.get('http://localhost:3001/api/wallets');
    setWallets(updatedWallets.data.wallets);
  };

  

  return (
    <ChaosPaper>
      <Box mb={2}>
        <Button variant="contained" color="primary" onClick={generateWallets}>
          Create 30 Wallets
        </Button>
        <Button variant="contained" color="primary" onClick={fundWallets} sx={{ ml: 2 }}>
          Drip SOL
        </Button>
        <Button variant="contained" color="primary" onClick={buyTokens} sx={{ ml: 2 }}>
          Buy Tokens
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>SOL Balance</TableCell>
            <TableCell>Token Holdings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {wallets.map((wallet) => (
            <TableRow key={wallet.address}>
              <TableCell>{wallet.address}</TableCell>
              <TableCell>{wallet.solBalance}</TableCell>
              <TableCell>{wallet.tokenBalance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChaosPaper>
  );
};

export default WalletManager;