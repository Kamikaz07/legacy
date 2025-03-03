import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Box, LinearProgress, Paper } from '@mui/material';
import { styled } from '@mui/system';

const ChaosPaper = styled(Paper)({ /* Same styling */ });

const Mixer = () => {
  const [destination, setDestination] = useState('');
  const [mixing, setMixing] = useState(false);

  const mixFunds = async () => {
    setMixing(true);
    await axios.post('http://localhost:3001/api/mix-funds', { destination });
    setMixing(false);
    alert('Funds Mixed!');
  };

  return (
    <ChaosPaper>
      <TextField
        label="Destination Address"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        fullWidth
        margin="normal"
        InputLabelProps={{ style: { color: '#ff4444' } }}
      />
      <Button variant="contained" color="primary" onClick={mixFunds} disabled={mixing}>
        Mix Funds
      </Button>
      {mixing && <LinearProgress sx={{ mt: 2 }} />}
    </ChaosPaper>
  );
};

export default Mixer;