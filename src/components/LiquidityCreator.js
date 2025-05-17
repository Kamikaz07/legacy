import React, { useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/system";

const ChaosPaper = styled(Paper)({
  padding: "20px",
  backgroundColor: "#1a1a1a",
  color: "#ff4444",
  border: "2px solid #ff4444",
  borderRadius: "10px",
  maxWidth: "600px",
  margin: "20px auto",
});

const ChaosButton = styled(Button)({
  backgroundColor: "#ff4444",
  color: "#fff",
  "&:hover": { backgroundColor: "#cc3333" },
  marginTop: "20px",
});

const LiquidityCreator = ({ publicKey }) => {
  const [formData, setFormData] = useState({
    tokenAddress: "",
    solAmount: "",
    tokenAmount: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const API_KEY = process.env.REACT_APP_API_KEY || "seu-token-secreto-aqui";

  const validateForm = () => {
    const newErrors = {};
    if (!formData.tokenAddress)
      newErrors.tokenAddress = "Token address is required";
    const solNum = Number(formData.solAmount);
    if (!formData.solAmount || isNaN(solNum) || solNum <= 0)
      newErrors.solAmount = "SOL amount must be a positive number";
    const tokenNum = Number(formData.tokenAmount);
    if (!formData.tokenAmount || isNaN(tokenNum) || tokenNum <= 0)
      newErrors.tokenAmount = "Token amount must be a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleCreatePool = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(
        "http://localhost:3001/api/create-liquidity-pool",
        {
          tokenAddress: formData.tokenAddress,
          solAmount: Number(formData.solAmount) * 1e9, // Convert to lamports
          tokenAmount: Number(formData.tokenAmount) * 10 ** 6, // Assuming 6 decimals, adjust as needed
        },
        {
          headers: { Authorization: `Bearer ${API_KEY}` },
        },
      );
      setResult(response.data);
    } catch (error) {
      setResult({
        error: error.response?.data?.error || "Failed to create liquidity pool",
        details: error.response?.data?.details || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChaosPaper elevation={3}>
      <Typography variant="h4" gutterBottom>
        Add Liquidity
      </Typography>
      <Box component="form" onSubmit={(e) => e.preventDefault()}>
        <TextField
          label="Token Address"
          name="tokenAddress"
          value={formData.tokenAddress}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ style: { color: "#ff4444" } }}
          InputProps={{ style: { color: "#fff" } }}
          error={!!errors.tokenAddress}
          helperText={errors.tokenAddress}
        />
        <TextField
          label="SOL Amount"
          name="solAmount"
          type="number"
          value={formData.solAmount}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ style: { color: "#ff4444" } }}
          InputProps={{ style: { color: "#fff" } }}
          error={!!errors.solAmount}
          helperText={errors.solAmount}
        />
        <TextField
          label="Token Amount"
          name="tokenAmount"
          type="number"
          value={formData.tokenAmount}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ style: { color: "#ff4444" } }}
          InputProps={{ style: { color: "#fff" } }}
          error={!!errors.tokenAmount}
          helperText={errors.tokenAmount}
        />
        <ChaosButton
          variant="contained"
          onClick={handleCreatePool}
          disabled={loading}
          fullWidth
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Create Liquidity Pool"
          )}
        </ChaosButton>
      </Box>
      {result && (
        <Box mt={3}>
          {result.success ? (
            <>
              <Typography variant="h6">Liquidity Pool Created!</Typography>
              <Typography>Pool ID: {result.poolId}</Typography>
            </>
          ) : (
            <>
              <Typography color="error">Error: {result.error}</Typography>
              {result.details && (
                <Typography color="error">Details: {result.details}</Typography>
              )}
            </>
          )}
        </Box>
      )}
    </ChaosPaper>
  );
};

export default LiquidityCreator;
