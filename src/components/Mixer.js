import React, { useState } from "react";
import axios from "axios";
import {
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/system";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// Styled components matching WalletManager.js
const ChaosPaper = styled(Box)(({ theme }) => ({
  padding: "20px",
  backgroundColor: "#1a1a1a",
  color: "#fff",
  border: "2px solid #92E643",
  borderRadius: "10px",
}));

const ActionButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#92E643",
  color: "#000",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: "#7ac832",
    transform: "translateY(-2px)",
    boxShadow: "0 5px 15px rgba(146, 230, 67, 0.4)",
  },
  "&:active": {
    transform: "translateY(0)",
    boxShadow: "0 2px 8px rgba(146, 230, 67, 0.4)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
    transition: "all 0.5s ease",
  },
  "&:hover::before": {
    left: "100%",
    transition: "all 0.5s ease",
  },
  "&.Mui-disabled": {
    backgroundColor: "rgba(146, 230, 67, 0.3)",
    color: "rgba(0, 0, 0, 0.7)",
  },
}));

const Vortex = styled("div")({
  width: "100px",
  height: "100px",
  borderRadius: "50%",
  background:
    "conic-gradient(from 0deg, #92E643, #39ff14, #92E643, #39ff14, #92E643)",
  animation: "spin 2s linear infinite, pulse 4s ease infinite",
  margin: "20px auto",
  position: "relative",
  boxShadow: "0 0 30px rgba(146, 230, 67, 0.6)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "10%",
    left: "10%",
    right: "10%",
    bottom: "10%",
    background: "#101010",
    borderRadius: "50%",
    zIndex: 1,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "20%",
    left: "20%",
    right: "20%",
    bottom: "20%",
    borderRadius: "50%",
    background:
      "conic-gradient(from 180deg, #92E643, #39ff14, #92E643, #39ff14, #92E643)",
    animation: "spin 1.5s linear infinite reverse",
    zIndex: 2,
    opacity: 0.9,
  },
});

const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Fix signatures overflowing and style scrollbars

// Add this CSS at the top with other styled components
const StyledScrollBox = styled(Box)(({ theme }) => ({
  maxHeight: "200px",
  overflow: "auto",
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#92E643",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "#7ac832",
  },
}));

const SignatureLink = styled("a")({
  color: "#92E643",
  textDecoration: "none",
  display: "block",
  wordBreak: "break-all",
  margin: "4px 0",
  paddingRight: "10px",
  "&:hover": {
    textDecoration: "underline",
  },
});

const Mixer = () => {
  // eslint-disable-next-line no-unused-vars
  const { connection } = useConnection();
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amountInSol, setAmountInSol] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [addressError, setAddressError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [signatures, setSignatures] = useState([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [mixingStatus, setMixingStatus] = useState("");
  const [mixingSteps, setMixingSteps] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [operationId, setOperationId] = useState(null);

  // **Validation Functions**
  const validateAddress = (address) => {
    try {
      new PublicKey(address);
      setAddressError("");
    } catch {
      setAddressError("Invalid Solana address");
    }
  };

  const validateAmount = (amount) => {
    if (!amount) {
      setAmountError("Amount is required");
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      setAmountError("Amount must be a positive number");
    } else {
      setAmountError("");
    }
  };

  // **Handle Input Changes**
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDestinationAddress(value);
    validateAddress(value);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmountInSol(value);
    validateAmount(value);
  };

  // **Handle Mix Funds**
  const handleMixFunds = async () => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setSignatures([]);
    setConfirmedCount(0);
    setTotalTransactions(0);
    setMixingStatus("Initiating mixing process...");
    setMixingSteps([]);
    setCurrentChunk(0);
    setTotalChunks(0);
    setOperationId(null);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/mix-funds`,
        {
          destinationAddress,
          amountInSol,
        },
      );

      if (response.data.operationId) {
        // Store the operation ID
        setOperationId(response.data.operationId);
        setMixingStatus("Mixing in progress");

        // Start polling for updates
        pollMixingStatus(response.data.operationId);
      } else {
        setErrorMessage("Mixing failed: No operation ID received");
        setLoading(false);
      }
    } catch (error) {
      setErrorMessage(
        "Failed to initiate mixing: " +
          (error.response?.data?.error || error.message),
      );
      setLoading(false);
    }
  };

  // Add a polling function
  const pollMixingStatus = (id) => {
    const intervalId = setInterval(async () => {
      try {
        const statusResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/mix-status/${id}`,
        );
        const data = statusResponse.data;

        // Update UI based on status response
        setMixingSteps(data.steps || []);
        setCurrentChunk(data.currentChunk || 0);
        setTotalChunks(data.totalChunks || 0);
        setSignatures(data.signatures || []);
        setTotalTransactions(data.signatures?.length || 0);
        setConfirmedCount(data.signatures?.length || 0); // All signatures in response are confirmed

        // Update mixing status based on current step
        if (data.steps && data.steps.length > 0) {
          const latestStep = data.steps[data.steps.length - 1];
          if (latestStep.includes("hop")) {
            setMixingStatus("Multi-hop mixing in progress...");
          } else if (latestStep.includes("Waiting")) {
            setMixingStatus("Waiting between chunks for enhanced privacy...");
          } else if (latestStep.includes("Decoy")) {
            setMixingStatus("Creating decoy transactions for misdirection...");
          } else if (data.status === "preparing") {
            setMixingStatus("Preparing mixer wallets...");
          } else if (data.status === "splitting") {
            setMixingStatus("Splitting funds into random chunks...");
          } else if (data.status === "processing") {
            setMixingStatus("Processing chunks through multi-hop routes...");
          }
        }

        // Check if process is complete
        if (data.status === "completed") {
          setSuccessMessage(
            data.message || "Funds mixed successfully through multiple hops!",
          );
          setLoading(false);
          clearInterval(intervalId);
        } else if (data.status === "failed") {
          setErrorMessage(data.message || "Mixing failed");
          setLoading(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Error polling mix status:", error);
        // Don't stop polling on error, just log it
        // We might have temporary network issues
      }
    }, 2000); // Poll every 2 seconds

    // Store interval ID to clear it later if needed
    return () => clearInterval(intervalId);
  };

  return (
    <ChaosPaper>
      {/* Inject CSS keyframes for the vortex animation */}
      <style>{spinKeyframes}</style>

      <Typography
        variant="h5"
        gutterBottom
        sx={{ color: "#92E643", fontWeight: "bold" }}
      >
        SOL Mixer
      </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Mixers are sketchy territory. The blockchain’s public—don’t get sloppy.
      </Alert>

      {loading ? (
        <Box sx={{ textAlign: "center" }}>
          <Vortex />
          <Typography
            variant="h6"
            sx={{
              color: "#92E643",
              mb: 2,
              position: "relative",
              display: "inline-block",
              "&::after": {
                content: '""',
                position: "absolute",
                height: "15px",
                width: "5px",
                right: "-10px",
                background: "#92E643",
                animation: "typingCursor 1s infinite",
              },
            }}
          >
            {mixingStatus}
          </Typography>

          {totalChunks > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#fff", mb: 1 }}>
                Processing chunk {currentChunk} of {totalChunks}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(currentChunk / totalChunks) * 100 || 0}
                sx={{
                  mb: 1,
                  backgroundColor: "rgba(146, 230, 67, 0.2)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#92E643",
                  },
                }}
              />
            </Box>
          )}

          {totalTransactions > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#fff", mb: 1 }}>
                Transaction confirmation: {confirmedCount}/{totalTransactions}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(confirmedCount / totalTransactions) * 100 || 0}
                sx={{
                  backgroundColor: "rgba(146, 230, 67, 0.2)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#92E643",
                  },
                }}
              />
            </Box>
          )}

          {mixingSteps.length > 0 && (
            <StyledScrollBox
              sx={{
                textAlign: "left",
                mt: 2,
                p: 2,
                bgcolor: "rgba(0,0,0,0.3)",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: "#92E643", mb: 1 }}>
                Multi-Hop Mixing Progress:
              </Typography>
              {mixingSteps.map((step, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    color: step.includes("hop")
                      ? "#FFD700"
                      : step.includes("Decoy")
                        ? "#FF7F50"
                        : "#fff",
                    fontSize: "0.85rem",
                    fontWeight: step.includes("hop") ? "bold" : "normal",
                    wordBreak: "break-all",
                  }}
                >
                  {step}
                </Typography>
              ))}
            </StyledScrollBox>
          )}
        </Box>
      ) : (
        <Box
          component="form"
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Destination Address"
            value={destinationAddress}
            onChange={handleAddressChange}
            error={!!addressError}
            helperText={addressError}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                transition: "all 0.3s ease",
                "& fieldset": {
                  borderColor: "#92E643",
                  transition: "border-color 0.3s ease",
                },
                "&:hover fieldset": {
                  borderColor: "#92E643",
                  borderWidth: "2px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#92E643",
                  borderWidth: "2px",
                  boxShadow: "0 0 10px rgba(146, 230, 67, 0.5)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#92E643",
                transition: "all 0.3s ease",
              },
              "&:hover .MuiInputLabel-root": {
                textShadow: "0 0 8px rgba(146, 230, 67, 0.5)",
              },
              "& .MuiInputLabel-shrink": {
                transform: "translate(14px, -9px) scale(0.75)",
                textShadow: "0 0 5px rgba(146, 230, 67, 0.7)",
              },
            }}
          />
          <TextField
            label="Amount in SOL"
            type="number"
            value={amountInSol}
            onChange={handleAmountChange}
            error={!!amountError}
            helperText={amountError}
            fullWidth
            inputProps={{ step: "0.000000001" }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                transition: "all 0.3s ease",
                "& fieldset": {
                  borderColor: "#92E643",
                  transition: "border-color 0.3s ease",
                },
                "&:hover fieldset": {
                  borderColor: "#92E643",
                  borderWidth: "2px",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#92E643",
                  borderWidth: "2px",
                  boxShadow: "0 0 10px rgba(146, 230, 67, 0.5)",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#92E643",
                transition: "all 0.3s ease",
              },
              "&:hover .MuiInputLabel-root": {
                textShadow: "0 0 8px rgba(146, 230, 67, 0.5)",
              },
              "& .MuiInputLabel-shrink": {
                transform: "translate(14px, -9px) scale(0.75)",
                textShadow: "0 0 5px rgba(146, 230, 67, 0.7)",
              },
            }}
          />
          <ActionButton
            onClick={handleMixFunds}
            disabled={
              loading ||
              !!addressError ||
              !!amountError ||
              !destinationAddress ||
              !amountInSol
            }
          >
            Mix Funds
          </ActionButton>
        </Box>
      )}

      {successMessage && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="success">{successMessage}</Alert>
          {signatures.length > 0 && (
            <StyledScrollBox
              sx={{ mt: 1, p: 1, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 1 }}
            >
              <Typography variant="body2" sx={{ color: "#fff", mb: 1 }}>
                Transaction Signatures:
              </Typography>
              {signatures.map((sig, index) => (
                <SignatureLink
                  key={index}
                  href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {sig}
                </SignatureLink>
              ))}
            </StyledScrollBox>
          )}
        </Box>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}
    </ChaosPaper>
  );
};

export default Mixer;
