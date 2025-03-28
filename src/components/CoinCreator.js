import React, { useState, useCallback } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Alert,
} from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import AbcIcon from '@mui/icons-material/Abc';
import DescriptionIcon from '@mui/icons-material/Description';
import TwitterIcon from '@mui/icons-material/Twitter';
import LanguageIcon from '@mui/icons-material/Language';
import TelegramIcon from '@mui/icons-material/Telegram';
import { styled } from "@mui/material/styles";
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import { useNetwork } from "../context/NetworkContext";

const steps = [
  "Basic Information",
  "Technical Settings",
  "Social Links",
  "Revoke Authorities",
  "Confirmation",
];

const stepIcons = [
  <InfoIcon sx={{ color: '#92E643' }} />,
  <SettingsIcon sx={{ color: '#92E643' }} />,
  <LinkIcon sx={{ color: '#92E643' }} />,
  <SecurityIcon sx={{ color: '#92E643' }} />,
  <CheckCircleIcon sx={{ color: '#92E643' }} />,
];

const CustomStepConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: '#92E643',
      transition: 'all 0.4s ease',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: '#92E643',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2,
    border: 0,
    backgroundColor: 'rgba(146, 230, 67, 0.2)',
    borderRadius: 1,
    transition: 'all 0.4s ease',
  },
}));

const CustomStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  color: 'rgba(146, 230, 67, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  transition: 'all 0.8s ease',
  transform: 'scale(1)',
  '& .MuiSvgIcon-root': {
    fontSize: '1.5rem',
    transition: 'all 0.8s ease',
  },
  ...(ownerState.active && {
    color: '#92E643',
    transform: 'scale(1.2)',
    '& .MuiSvgIcon-root': {
      filter: 'drop-shadow(0 0 8px rgba(146, 230, 67, 0.5))',
    },
  }),
  ...(ownerState.completed && {
    color: '#92E643',
  }),
}));

function CustomStepIcon(props) {
  const { active, completed, className } = props;
  
  return (
    <CustomStepIconRoot ownerState={{ completed, active }} className={className}>
      {stepIcons[props.icon - 1]}
    </CustomStepIconRoot>
  );
}

const ChaosPaper = styled(Paper)(({ theme }) => ({
  padding: '20px',
  backgroundColor: 'rgba(10, 10, 10, 0.9)',
  color: '#fff',
  border: '1px solid rgba(146, 230, 67, 0.3)',
  borderRadius: '10px',
  boxShadow: '0 5px 20px rgba(0, 0, 0, 0.5)',
  position: 'relative',
  overflow: 'hidden',
  backgroundImage: 'radial-gradient(rgba(146, 230, 67, 0.03) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #92E643, transparent)',
    opacity: 0.7,
  },
  '& .MuiTableCell-root': {
    color: '#fff',
    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    backgroundColor: 'rgba(146, 230, 67, 0.1)',
    fontWeight: 'bold',
  }
}));

const CoinCreator = () => {
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();
  const { network, connection } = useNetwork();
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState("test img");
  const [symbol, setSymbol] = useState("IMG");
  const [description, setDescription] = useState("test img");
  const [imageFile, setImageFile] = useState(null);
  const [decimals, setDecimals] = useState(9);
  const [supply, setSupply] = useState(1000000000);
  const [tax, setTax] = useState(0);
  const [revokeMintAuthority, setRevokeMintAuthority] = useState(true);
  const [revokeFreezeAuthority, setRevokeFreezeAuthority] = useState(true);
  const [revokeUpdateAuthority, setRevokeUpdateAuthority] = useState(true);
  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    website: "",
    telegram: "",
  });
  const [mintAddress, setMintAddress] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenFee, setTokenFee] = useState(null);
  
  const MAX_NAME_LENGTH = 18;
  const MAX_SYMBOL_LENGTH = 8;
  const MAX_DESCRIPTION_LENGTH = 500;
  const MAX_IMAGE_SIZE = 200 * 1024; // 200 KB
  const MAX_IMAGE_DIMENSIONS = 512; // 512x512 pixels

  const base64ToUint8Array = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        if (img.width > MAX_IMAGE_DIMENSIONS || img.height > MAX_IMAGE_DIMENSIONS) {
          setErrorMessage(`Image exceeds maximum dimensions of ${MAX_IMAGE_DIMENSIONS}x${MAX_IMAGE_DIMENSIONS} pixels.`);
          setImageFile(null);
        } else {
          setImageFile(file);
          setErrorMessage(null);
        }
      };
      img.src = URL.createObjectURL(file);
    } else {
      setErrorMessage("Invalid file. Only PNG up to 200KB.");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    maxSize: MAX_IMAGE_SIZE,
    onDropRejected: () => setErrorMessage("Invalid file. Only PNG up to 200KB."),
  });

  const handleNext = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    
    // Carregar o valor da taxa quando o usuário alcançar a tela de confirmação
    if (nextStep === 4) {
      fetchTokenFee();
    }
  };

  // Função para buscar o valor da taxa do token antes da criação
  const fetchTokenFee = async () => {
    if (!connected || !publicKey) return;
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/token-fee?network=${network}`
      );
      
      if (response.data && response.data.fee) {
        setTokenFee(response.data.fee);
      }
    } catch (error) {
      console.error("Error fetching token fee:", error);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!connected || !publicKey) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (
      name.length > MAX_NAME_LENGTH ||
      symbol.length > MAX_SYMBOL_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      setErrorMessage("Fields exceed maximum allowed length.");
      return;
    }
    if (!name || !symbol || !imageFile) {
      setErrorMessage("Name, Symbol, and Image are required.");
      return;
    }
    if (decimals < 1 || decimals > 9) {
      setErrorMessage("Decimals must be between 1 and 9.");
      return;
    }
    if (supply <= 0) {
      setErrorMessage("Supply must be greater than zero.");
      return;
    }
    if (tax < 0 || tax > 5000) {
      setErrorMessage("Transfer Tax must be between 0 and 5000 basis points.");
      return;
    }
  
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", name);
      formData.append("symbol", symbol);
      formData.append("description", description);
      formData.append("decimals", decimals);
      formData.append("supply", supply);
      formData.append("tax", tax);
      formData.append("creatorPublicKey", publicKey.toBase58());
      formData.append("network", network);
      formData.append("revokeMintAuthority", revokeMintAuthority);
      formData.append("revokeFreezeAuthority", revokeFreezeAuthority);
      formData.append("revokeUpdateAuthority", revokeUpdateAuthority);
  
      const filteredSocialLinks = {};
      if (socialLinks.website) filteredSocialLinks.website = socialLinks.website;
      if (socialLinks.twitter) filteredSocialLinks.twitter = socialLinks.twitter;
      if (socialLinks.telegram)
        filteredSocialLinks.telegram = socialLinks.telegram;
  
      if (Object.keys(filteredSocialLinks).length > 0) {
        formData.append("socialLinks", JSON.stringify(filteredSocialLinks));
      }
  
      console.log("Sending POST request to create token");

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/create-token`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      if (response.status === 200) {
        // Definir a taxa recebida na resposta
        if (response.data.fee) {
          setTokenFee(response.data.fee);
        }
        
        const transactionBytes = base64ToUint8Array(response.data.transaction);
        const transaction = Transaction.from(transactionBytes);
        
        // Verificar o saldo da carteira
        const userBalance = await connection.getBalance(publicKey);
        const feeInLamports = response.data.fee * LAMPORTS_PER_SOL;
        
        if (userBalance < feeInLamports + 5000) { // 5000 lamports para taxa de rede
          throw new Error(`Insufficient balance. You need at least ${response.data.fee} SOL to create this token.`);
        }
        
        const signedTransaction = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            signature,
            blockhash: transaction.recentBlockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );
        setMintAddress(response.data.mintPublicKey);
        setErrorMessage(null);
        setActiveStep(steps.length);
      } else {
        setErrorMessage("Error creating token. Please try again.");
      }
    } catch (error) {
      console.error("Request error:", error);
      setErrorMessage(
        error.response?.data?.error || error.message || 
        "Error creating token. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = () => {
    if (activeStep === 3) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleNext} 
            disabled={loading} 
            sx={{ backgroundColor: '#92E643', color: '#000' }}
          >
            Next
          </Button>
        </Box>
      );
    } else if (activeStep === 4) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={loading} 
            sx={{ backgroundColor: '#92E643', color: '#000' }}
          >
            {loading ? <CircularProgress size={24} /> : "Create Token"}
          </Button>
        </Box>
      );
    } else if (activeStep < 3) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleNext} 
            disabled={loading} 
            sx={{ backgroundColor: '#92E643', color: '#000' }}
          >
            Next
          </Button>
        </Box>
      );
    }
    return null;
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Name (max 18 characters)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputProps={{ startAdornment: <PersonIcon sx={{ color: '#92E643', mr: 1 }} /> }}
                  error={name.length > MAX_NAME_LENGTH}
                  helperText={name.length > MAX_NAME_LENGTH ? `Maximum ${MAX_NAME_LENGTH} characters` : ''}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '&:hover fieldset': { borderColor: '#92E643' },
                      '&.Mui-focused fieldset': { borderColor: '#92E643' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Symbol (max 8 characters)"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputProps={{ startAdornment: <AbcIcon sx={{ color: '#92E643', mr: 1 }} /> }}
                  error={symbol.length > MAX_SYMBOL_LENGTH}
                  helperText={symbol.length > MAX_SYMBOL_LENGTH ? `Maximum ${MAX_SYMBOL_LENGTH} characters` : ''}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      '&:hover fieldset': { borderColor: '#92E643' },
                      '&.Mui-focused fieldset': { borderColor: '#92E643' },
                    },
                  }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Description (max 500 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={4}
              InputProps={{ startAdornment: <DescriptionIcon sx={{ color: '#92E643', mr: 1, alignSelf: 'flex-start', mt: 1 }} /> }}
              error={description.length > MAX_DESCRIPTION_LENGTH}
              helperText={description.length > MAX_DESCRIPTION_LENGTH ? `Maximum ${MAX_DESCRIPTION_LENGTH} characters` : ''}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
            {!imageFile ? (
              <div
                {...getRootProps()}
                style={{
                  border: '2px dashed #92E643',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginTop: '16px',
                  background: 'rgba(57, 255, 20, 0.05)',
                  borderRadius: '8px',
                }}
              >
                <input {...getInputProps()} />
                <Typography>Drag and drop an image here, or click to select</Typography>
                <Typography variant="caption" color="textSecondary">
                  (Format: PNG, max size: 200KB, max dimensions: 512x512 pixels)
                </Typography>
              </div>
            ) : (
              <Box mt={2} sx={{ textAlign: 'center' }}>
                <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ maxWidth: "200px" }} />
                <Button 
                  onClick={() => setImageFile(null)} 
                  sx={{ display: 'block', margin: '10px auto', color: '#92E643' }}
                >
                  Change Image
                </Button>
              </Box>
            )}
          </>
        );
      case 1:
        return (
          <>
            <TextField
              label="Decimals (1-9)"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 1, max: 9 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
            <TextField
              label="Supply"
              value={supply}
              onChange={(e) => setSupply(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 1 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="tax-label">Transfer Tax (0-5%)</InputLabel>
              <Select
                labelId="tax-label"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                label="Transfer Tax (0-5%)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover fieldset': { borderColor: '#92E643' },
                    '&.Mui-focused fieldset': { borderColor: '#92E643' },
                  },
                }}
              >
                <MenuItem value={0}>0%</MenuItem>
                <MenuItem value={1000}>1%</MenuItem>
                <MenuItem value={2000}>2%</MenuItem>
                <MenuItem value={3000}>3%</MenuItem>
                <MenuItem value={4000}>4%</MenuItem>
                <MenuItem value={5000}>5%</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              The transfer tax is charged on each token transaction. 100 basis points = 1%.
            </Typography>
          </>
        );
      case 2:
        return (
          <>
            <TextField
              label="Twitter (optional)"
              value={socialLinks.twitter}
              onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
              fullWidth
              margin="normal"
              InputProps={{ startAdornment: <TwitterIcon sx={{ color: '#92E643', mr: 1 }} /> }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
            <TextField
              label="Website (optional)"
              value={socialLinks.website}
              onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
              fullWidth
              margin="normal"
              InputProps={{ startAdornment: <LanguageIcon sx={{ color: '#92E643', mr: 1 }} /> }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
            <TextField
              label="Telegram (optional)"
              value={socialLinks.telegram}
              onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
              fullWidth
              margin="normal"
              InputProps={{ startAdornment: <TelegramIcon sx={{ color: '#92E643', mr: 1 }} /> }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '&:hover fieldset': { borderColor: '#92E643' },
                  '&.Mui-focused fieldset': { borderColor: '#92E643' },
                },
              }}
            />
          </>
        );
      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Tooltip title="Prevents the creation of new tokens after launch">
                <Card sx={{ background: '#020301', borderRadius: '8px' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#92E643' }}>Revoke Mint Authority</Typography>
                    <Typography variant="body2">
                      Revoking mint authority prevents more tokens from being created in the future.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={revokeMintAuthority}
                          onChange={(e) => setRevokeMintAuthority(e.target.checked)}
                          sx={{ color: '#92E643', '&.Mui-checked': { color: '#92E643' } }}
                        />
                      }
                      label="Enable"
                    />
                  </CardContent>
                </Card>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Tooltip title="Prevents token accounts from being frozen">
                <Card sx={{ background: '#020301', borderRadius: '8px' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#92E643' }}>Revoke Freeze Authority</Typography>
                    <Typography variant="body2">
                      Revoking freeze authority prevents token accounts from being frozen.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={revokeFreezeAuthority}
                          onChange={(e) => setRevokeFreezeAuthority(e.target.checked)}
                          sx={{ color: '#92E643', '&.Mui-checked': { color: '#92E643' } }}
                        />
                      }
                      label="Enable"
                    />
                  </CardContent>
                </Card>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Tooltip title="Prevents changes to token metadata">
                <Card sx={{ background: '#020301', borderRadius: '8px' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#92E643' }}>Revoke Update Authority</Typography>
                    <Typography variant="body2">
                      Revoking update authority prevents changes to token metadata.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={revokeUpdateAuthority}
                          onChange={(e) => setRevokeUpdateAuthority(e.target.checked)}
                          sx={{ color: '#92E643', '&.Mui-checked': { color: '#92E643' } }}
                        />
                      }
                      label="Enable"
                    />
                  </CardContent>
                </Card>
              </Tooltip>
            </Grid>
          </Grid>
        );
      case 4: // Confirmação (antigo passo 5)
        return (
          <Box sx={{ padding: 2, marginLeft: 4 }}>
            <Typography variant="h6" sx={{ color: '#92E643', mb: 2 }}>
              Review Token Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Basic Information</Typography>
                    <Typography><strong>Name:</strong> {name}</Typography>
                    <Typography><strong>Symbol:</strong> {symbol}</Typography>
                    <Typography><strong>Description:</strong> {description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Technical Details</Typography>
                    <Typography><strong>Decimals:</strong> {decimals}</Typography>
                    <Typography><strong>Supply:</strong> {supply.toLocaleString()}</Typography>
                    <Typography><strong>Network:</strong> {network}</Typography>
                    <Typography><strong>Tax:</strong> {tax/100}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: 'rgba(10, 10, 10, 0.7)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Security Settings</Typography>
                    <Typography><strong>Mint Authority Revoked:</strong> {revokeMintAuthority ? "Yes" : "No"}</Typography>
                    <Typography><strong>Freeze Authority Revoked:</strong> {revokeFreezeAuthority ? "Yes" : "No"}</Typography>
                    <Typography><strong>Update Authority Revoked:</strong> {revokeUpdateAuthority ? "Yes" : "No"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: 'rgba(10, 10, 10, 0.7)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Payment</Typography>
                    <Typography><strong>Creation Fee:</strong> {tokenFee || "Loading..."} SOL</Typography>
                    <Typography variant="caption" color="textSecondary">
                      This fee will be automatically deducted from your wallet when creating the token.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card sx={{ backgroundColor: 'rgba(10, 10, 10, 0.7)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Social Links</Typography>
                    <Typography><strong>Website:</strong> {socialLinks.website || "None"}</Typography>
                    <Typography><strong>Twitter:</strong> {socialLinks.twitter || "None"}</Typography>
                    <Typography><strong>Telegram:</strong> {socialLinks.telegram || "None"}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 5: // Resultado final
        return (
          <Box sx={{ padding: 2, marginLeft: 4 }}>
            {mintAddress ? (
              <>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon sx={{ color: '#92E643', fontSize: 40 }} />
                  <Typography variant="h6">Token created successfully!</Typography>
                </Box>
                <Typography sx={{ mt: 2 }}>Token Address: {mintAddress}</Typography>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2, mr: 2 }}
                  href={`https://raydium.io/liquidity/create-pool/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create Liquidity Pool
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2, mr: 2 }}
                  href={`https://solscan.io/token/${mintAddress}${network !== 'mainnet-beta' ? `?cluster=${network}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Solscan
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2 }}
                  href={`https://explorer.solana.com/address/${mintAddress}${network !== 'mainnet-beta' ? `?cluster=${network}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                </Button>
              </>
            ) : (
              <Typography>Error creating token. Please try again.</Typography>
            )}
          </Box>
        );
      default:
        return "Unknown step";
    }
  };

  return (
    <ChaosPaper>
    <Box>
      <Typography variant="h5" sx={{ color: '#92E643' }}>Create a new token</Typography>
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel 
        connector={<CustomStepConnector />}
        sx={{ 
          my: 4,
          '& .MuiStepLabel-label': {
            color: 'rgba(255, 255, 255, 0.5)',
            transition: 'all 0.8s ease',
            fontSize: '0.875rem',
            '&.Mui-active': {
              color: '#92E643',
              fontWeight: 500,
              textShadow: '0 0 10px rgba(146, 230, 67, 0.3)',
            },
            '&.Mui-completed': {
              color: '#92E643',
            }
          },
          '& .MuiStepLabel-iconContainer': {
            transition: 'all 0.8s ease',
          }
        }}
      >
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel StepIconComponent={CustomStepIcon}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box mt={2}>
        {activeStep === steps.length ? (
          <Box sx={{ padding: 2, marginLeft: 4 }}>
            {mintAddress ? (
              <>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon sx={{ color: '#92E643', fontSize: 40 }} />
                  <Typography variant="h6">Token created successfully!</Typography>
                </Box>
                <Typography sx={{ mt: 2 }}>Token Address: {mintAddress}</Typography>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2, mr: 2 }}
                  href={`https://raydium.io/liquidity/create-pool/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create Liquidity Pool
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2, mr: 2 }}
                  href={`https://solscan.io/token/${mintAddress}${network !== 'mainnet-beta' ? `?cluster=${network}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Solscan
                </Button>
                <Button
                  variant="contained"
                  sx={{ backgroundColor: '#92E643', color: '#000', mt: 2 }}
                  href={`https://explorer.solana.com/address/${mintAddress}${network !== 'mainnet-beta' ? `?cluster=${network}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer
                </Button>
              </>
            ) : (
              <Typography>Error creating token. Please try again.</Typography>
            )}
          </Box>
        ) : (
          <>
            {getStepContent(activeStep)}
            <Box mt={2} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                {activeStep !== 0 && activeStep !== 5 && (
                  <Button onClick={handleBack} sx={{ color: '#92E643' }}>
                    Back
                  </Button>
                )}
              </Box>
              {renderActionButton()}
            </Box>
          </>
        )}
      </Box>
      {errorMessage && (
        <Typography mt={2} color="error">
          {errorMessage}
        </Typography>
      )}
    </Box>
    </ChaosPaper>
  );
};

export default CoinCreator;