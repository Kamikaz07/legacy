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
} from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, Transaction } from "@solana/web3.js";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const steps = [
  "Informações Básicas",
  "Configurações Técnicas",
  "Links Sociais",
  "Revogar Autoridades",
  "Confirmação",
];

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
      console.log("Arquivo aceito:", file);
      setImageFile(file);
    } else {
      console.log("Nenhum arquivo aceito pelo useDropzone.");
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    maxSize: 300 * 1024,
    onDropRejected: () => setErrorMessage("Ficheiro inválido. Apenas PNG até 300KB."),
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!connected || !publicKey) {
      setErrorMessage("Por favor, conecte a sua carteira primeiro.");
      return;
    }
    if (name.length > MAX_NAME_LENGTH || symbol.length > MAX_SYMBOL_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
      setErrorMessage("Os campos excedem o comprimento máximo permitido.");
      return;
    }
    if (!name || !symbol || !imageFile) {
      setErrorMessage("Nome, Símbolo e Imagem são obrigatórios.");
      return;
    }
    if (decimals < 0 || decimals > 18) {
      setErrorMessage("Decimals deve estar entre 0 e 18.");
      return;
    }
    if (supply <= 0) {
      setErrorMessage("Supply deve ser maior que zero.");
      return;
    }
    if (tax < 0 || tax > 1000) {
      setErrorMessage("Taxa de Transferência deve estar entre 0 e 1000 basis points.");
      return;
    }

    setLoading(true);
    try {
      const csrfResponse = await axios.get(process.env.REACT_APP_API_URL + "/api/get-csrf-token", {
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
        console.log("Token criado com sucesso! Mint:", response.data.mintPublicKey, "TxID:", signature);
        handleNext();
      } else {
        setErrorMessage("Erro ao criar o token. Por favor, tente novamente.");
      }
    } catch (error) {
      setErrorMessage("Erro ao criar o token. Verifique a conexão ou o servidor.");
      console.error("Erro detalhado:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = () => {
    if (activeStep === 3) {
      return (
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Criar Token"}
        </Button>
      );
    } else if (activeStep < 3) {
      return (
        <Button variant="contained" onClick={handleNext} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Próximo"}
        </Button>
      );
    }
    return null;
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Símbolo"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              margin="normal"
            />
            <div
              {...getRootProps()}
              style={{
                border: "2px dashed #ccc",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                marginTop: "16px",
              }}
            >
              <input {...getInputProps()} />
              <Typography>
                Arraste e solte a imagem aqui, ou clique para selecionar
              </Typography>
              <Typography variant="caption" color="textSecondary">
                (Formato: PNG, tamanho máximo: 300KB)
              </Typography>
            </div>
            {imageFile && (
              <Box mt={2}>
                <Typography>Prévia da imagem:</Typography>
                <img src={URL.createObjectURL(imageFile)} alt="Prévia" style={{ maxWidth: "200px" }} />
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
            />
            <TextField
              label="Supply"
              value={supply}
              onChange={(e) => setSupply(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Taxa de Transferência (0-1000 basis points)"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              inputProps={{ min: 0, max: 1000 }}
            />
            <Typography variant="caption" color="textSecondary">
              A taxa de transferência é cobrada em cada transação do token. 100 basis points = 1%.
            </Typography>
          </>
        );
      case 2:
        return (
          <>
            <TextField
              label="Twitter (opcional)"
              value={socialLinks.twitter}
              onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Website (opcional)"
              value={socialLinks.website}
              onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Telegram (opcional)"
              value={socialLinks.telegram}
              onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
              fullWidth
              margin="normal"
            />
          </>
        );
      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Revogar Mint Authority</Typography>
                  <Typography variant="body2">
                    Revogar a autoridade de mint impede que mais tokens sejam criados no futuro.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={revokeMintAuthority}
                        onChange={(e) => setRevokeMintAuthority(e.target.checked)}
                      />
                    }
                    label="Ativar"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Revogar Freeze Authority</Typography>
                  <Typography variant="body2">
                    Revogar a autoridade de freeze impede que contas de tokens sejam congeladas.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={revokeFreezeAuthority}
                        onChange={(e) => setRevokeFreezeAuthority(e.target.checked)}
                      />
                    }
                    label="Ativar"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Revogar Update Authority</Typography>
                  <Typography variant="body2">
                    Revogar a autoridade de update impede alterações nos metadados do token.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={revokeUpdateAuthority}
                        onChange={(e) => setRevokeUpdateAuthority(e.target.checked)}
                      />
                    }
                    label="Ativar"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Box sx={{ padding: 2, marginLeft: 4 }}>
            {mintAddress ? (
              <>
                <Typography variant="h6">Token criado com sucesso!</Typography>
                <Typography sx={{ mar: 2 }}>Token Address: {mintAddress}</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  href={`https://raydium.io/liquidity/create-pool/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2, mr: 2 }}
                >
                  Create Liquidity Pool
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2, mr: 2 }}
                >
                  View on Solscan
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2 }}
                >
                  View on Explorer
                </Button>
              </>
            ) : (
              <Typography>Erro ao criar o token. Por favor, tente novamente.</Typography>
            )}
          </Box>
        );
      default:
        return "Etapa desconhecida";
    }
  };

  return (
    <Box>
      <Typography variant="h5">Criar um novo token</Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box mt={2}>
        {activeStep === steps.length ? (
          <Typography>Token criado com sucesso!</Typography>
        ) : (
          <>
            {getStepContent(activeStep)}
            <Box mt={2}>
              {activeStep !== 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Voltar
                </Button>
              )}
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