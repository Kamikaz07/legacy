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
} from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, Transaction } from "@solana/web3.js";
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

const CoinCreator = () => {
  const { connected, publicKey, signTransaction } = useWallet();
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

  const MAX_NAME_LENGTH = 32;
  const MAX_SYMBOL_LENGTH = 10;
  const MAX_DESCRIPTION_LENGTH = 200;

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

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
      setImageFile(file);
    } else {
      setErrorMessage("Invalid file. PNG only up to 300KB.");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    maxSize: 300 * 1024,
    onDropRejected: () => setErrorMessage("Invalid file. PNG only up to 300KB."),
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!connected || !publicKey) {
      setErrorMessage("Please connect your wallet first.");
      return;
    }
    if (name.length > MAX_NAME_LENGTH || symbol.length > MAX_SYMBOL_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
      setErrorMessage("Fields exceed maximum allowed length.");
      return;
    }
    if (!name || !symbol || !imageFile) {
      setErrorMessage("Name, Symbol and Image are required.");
      return;
    }
    if (decimals < 0 || decimals > 18) {
      setErrorMessage("Decimals must be between 0 and 10.");
      return;
    }
    if (supply <= 0) {
      setErrorMessage("Supply must be greater than zero.");
      return;
    }
    if (tax < 0 || tax > 1000) {
      setErrorMessage("Transfer Tax must be between 0 and 1000 basis points.");
      return;
    }

    setLoading(true);
    try {
      const csrfResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/get-csrf-token`, {
        withCredentials: true,
      });
      const csrfToken = csrfResponse.data.csrfToken;

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", name);
      formData.append("symbol", symbol);
      formData.append("description", description);
      formData.append("decimals", decimals);
      formData.append("supply", supply);
      formData.append("tax", tax);
      formData.append("creatorPublicKey", publicKey.toBase58());
      formData.append("revokeMintAuthority", revokeMintAuthority);
      formData.append("revokeFreezeAuthority", revokeFreezeAuthority);
      formData.append("revokeUpdateAuthority", revokeUpdateAuthority);

      const filteredSocialLinks = {};
      if (socialLinks.website) filteredSocialLinks.website = socialLinks.website;
      if (socialLinks.twitter) filteredSocialLinks.twitter = socialLinks.twitter;
      if (socialLinks.telegram) filteredSocialLinks.telegram = socialLinks.telegram;

      if (Object.keys(filteredSocialLinks).length > 0) {
        formData.append("socialLinks", JSON.stringify(filteredSocialLinks));
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/create-token`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-CSRF-Token": csrfToken,
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        const transactionBytes = base64ToUint8Array(response.data.transaction);
        const transaction = Transaction.from(transactionBytes);
        const signedTransaction = await signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
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
        handleNext();
      } else {
        setErrorMessage("Error creating token. Please try again.");
            }
          } catch (error) {
            setErrorMessage(error.response?.data?.message || "Error creating token. Check your connection or the server.");
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
            label="Name"
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
            label="Symbol"
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
              label="Description"
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
            (Format: PNG, max size: 300KB)
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
              label="Decimals (0-18)"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 18 }}
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
            <TextField
              label="Transfer Tax (0-1000 basis points)"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 1000 }}
              sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&:hover fieldset': { borderColor: '#92E643' },
            '&.Mui-focused fieldset': { borderColor: '#92E643' },
          },
              }}
            />
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
      case 4:
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
            href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan
          </Button>
          <Button
            variant="contained"
            sx={{ backgroundColor: '#92E643', color: '#000', mt: 2 }}
            href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
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
        return "Etapa desconhecida";
    }
  };

  return (
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
          <Typography>Token created successfully!</Typography>
        ) : (
          <>
            {getStepContent(activeStep)}
            <Box mt={2} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                {activeStep !== 0 && activeStep !== 4 && (
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
  );
};

export default CoinCreator;