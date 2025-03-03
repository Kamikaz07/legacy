import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Typography, Box, Paper, CircularProgress } from '@mui/material';
import { styled } from '@mui/system';

const ChaosPaper = styled(Paper)({
  padding: '20px',
  backgroundColor: '#1a1a1a',
  color: '#ff4444',
  border: '2px solid #ff4444',
  borderRadius: '10px',
  maxWidth: '500px',
  margin: '20px auto',
});

const RugButton = styled(Button)({
  backgroundColor: '#ff0000',
  '&:hover': { backgroundColor: '#cc0000' },
  fontSize: '20px',
  padding: '15px',
});

const RugPull = () => {
  const [stats, setStats] = useState({ solBalance: 0, tokenBalance: 0, price: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/pool-stats');
        setStats(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch pool stats');
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const pullRug = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3001/api/rug-pull');
      if (response.data.success) {
        alert('Rug Pulled Successfully! 💀 Transaction ID: ' + response.data.txId);
        setStats({ solBalance: 0, tokenBalance: 0, price: 0 });
      }
    } catch (error) {
      alert('Rug Pull Failed: ' + error.response?.data?.details);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChaosPaper>
      <Typography variant="h6">Pool Stats</Typography>
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <Typography>SOL in Pool: {stats.solBalance.toFixed(2)} SOL</Typography>
          <Typography>Tokens in Pool: {stats.tokenBalance.toFixed(2)}</Typography>
          <Typography>Price: {stats.price.toFixed(6)} SOL per Token</Typography>
          <Typography>Potential Haul: {stats.solBalance.toFixed(2)} SOL</Typography>
        </>
      )}
      <Box mt={4}>
        <RugButton variant="contained" onClick={pullRug} disabled={loading || !!error}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'PULL THE RUG'}
        </RugButton>
      </Box>
    </ChaosPaper>
  );
};

export default RugPull;