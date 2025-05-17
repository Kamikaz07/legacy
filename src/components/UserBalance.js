import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Box, Typography, CircularProgress } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useNetwork } from "../context/NetworkContext";

const UserBalance = () => {
  const { connection, network } = useNetwork();
  const wallet = useWallet();
  const [solBalance, setSolBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setSolBalance(0);
      setError(false);
      return;
    }

    const getSolBalance = async () => {
      try {
        setLoading(true);
        setError(false);

        // Use a retry mechanism for mainnet which can be less reliable
        let attempts = 0;
        const maxAttempts = 3;
        let balance = null;

        while (attempts < maxAttempts && balance === null) {
          try {
            balance = await connection.getBalance(wallet.publicKey);
          } catch (err) {
            attempts++;
            console.warn(
              `Attempt ${attempts} failed to fetch balance: ${err.message}`,
            );

            // Wait a bit before retrying
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (balance !== null) {
          setSolBalance(balance / 1e9); // Convert lamports to SOL
          setError(false);
        } else {
          throw new Error("Failed to fetch balance after multiple attempts");
        }
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
        setError(true);
        setSolBalance(0);
      } finally {
        setLoading(false);
      }
    };

    getSolBalance();

    // Setup balance refresh on network change and periodic refresh
    const intervalId = setInterval(getSolBalance, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, [wallet.connected, wallet.publicKey, connection, network]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        color: "#fff",
        fontFamily: "'Press Start 2P', cursive",
        fontSize: "0.8rem",
      }}
    >
      <AccountBalanceWalletIcon sx={{ color: "#92E643" }} />
      <Typography
        sx={{
          color: "#fff",
          minWidth: "120px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {!wallet.connected ? (
          "Not Connected"
        ) : loading ? (
          <CircularProgress size={16} sx={{ color: "#92E643", mr: 1 }} />
        ) : error ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ErrorOutlineIcon sx={{ color: "#ff6b6b", fontSize: 16, mr: 1 }} />
            <span>Check RPC</span>
          </Box>
        ) : (
          `${solBalance.toFixed(4)} SOL`
        )}
      </Typography>
    </Box>
  );
};

export default UserBalance;
