import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  Paper, 
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  LinearProgress,
  InputAdornment,
  TablePagination
} from '@mui/material';
import { styled } from '@mui/system';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, Connection, PublicKey } from '@solana/web3.js';

const ChaosPaper = styled(Paper)(({ theme }) => ({
  padding: '20px',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  border: '2px solid #92E643',
  borderRadius: '10px',
  '& .MuiTableCell-root': {
    color: '#fff',
    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    backgroundColor: 'rgba(146, 230, 67, 0.1)',
    fontWeight: 'bold',
  }
}));

const ActionButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#92E643',
  color: '#000',
  '&:hover': {
    backgroundColor: '#7ac832',
  },
  '&.Mui-disabled': {
    backgroundColor: 'rgba(146, 230, 67, 0.3)',
    color: 'rgba(0, 0, 0, 0.7)',
  }
}));

const WalletManager = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [solAmount, setSolAmount] = useState('0.1');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [masterTokens, setMasterTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [tokenPercentage, setTokenPercentage] = useState('5');
  const [progressValue, setProgressValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletStats, setWalletStats] = useState({ totalWallets: 0, fromDatabase: false, newlyCreated: 0 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [walletsToCreate, setWalletsToCreate] = useState(30);

  // Função para buscar tokens da carteira mestra
  const fetchMasterTokens = async () => {
    if (!publicKey) return;
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/master-tokens/${publicKey.toString()}`);
      setMasterTokens(response.data.tokens);
    } catch (error) {
      console.error('Failed to fetch master tokens:', error);
    }
  };

  useEffect(() => {
    fetchMasterTokens();
  }, [publicKey]);

  // Carregar carteiras ao montar o componente
  useEffect(() => {
    fetchWallets();
  }, []);

  // Função para buscar carteiras existentes
  const fetchWallets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallets`);
      if (response.data.wallets && response.data.wallets.length > 0) {
        setWallets(response.data.wallets);
        setWalletStats({
          ...walletStats,
          totalWallets: response.data.wallets.length,
          fromDatabase: true
        });
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    }
  };

  const generateWallets = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/generate-wallets`, {
        count: walletsToCreate // Send the count to the API
      });
      
      setWallets(response.data.wallets);
      setWalletStats({
        totalWallets: response.data.wallets.length,
        fromDatabase: response.data.fromDatabase,
        newlyCreated: response.data.newlyCreated || 0
      });
      
      // Mostrar mensagem de sucesso
      if (response.data.fromDatabase && response.data.newlyCreated === 0) {
        setSuccessMessage('Carteiras carregadas do banco de dados.');
      } else if (response.data.newlyCreated > 0) {
        setSuccessMessage(`Criadas ${response.data.newlyCreated} novas carteiras. Total: ${response.data.wallets.length}`);
      } else {
        setSuccessMessage('30 carteiras geradas com sucesso!');
      }
    } catch (error) {
      setError('Failed to generate wallets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fundWallets = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgressValue(0);
    setIsProcessing(true);
    
    try {
      setSuccessMessage('Preparing transactions to distribute SOL...');
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/fund-wallets`, { 
        masterAddress: publicKey.toString(),
        solAmount: solAmount
      });
      
      const { transactions, amountPerWallet, batches } = response.data;
      let completedBatches = 0;
      const signatures = [];
      
      // Processar cada transação em sequência
      for (const txBase64 of transactions) {
        try {
          // Converter base64 para Uint8Array
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          const transaction = Transaction.from(txBytes);
          
          // Assinar a transação
          setSuccessMessage(`Signing transaction ${completedBatches + 1}/${batches}...`);
          const signedTx = await signTransaction(transaction);
          
          // Enviar a transação
          setSuccessMessage(`Sending transaction ${completedBatches + 1}/${batches}...`);
          const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          
          signatures.push(signature);
          setSuccessMessage(`Waiting for confirmation of transaction ${completedBatches + 1}/${batches}...`);
          
          // Confirmar a transação usando a abordagem não depreciada
          const latestBlockhash = await connection.getLatestBlockhash();
          const confirmationResponse = await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          // Verificar se houve erros na confirmação
          if (confirmationResponse.value.err) {
            throw new Error(`Erro de confirmação: ${JSON.stringify(confirmationResponse.value.err)}`);
          }
          
          // Verificar o status da transação após a confirmação
          const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });
          
          if (status.value && status.value.err) {
            throw new Error(`Transação falhou: ${JSON.stringify(status.value.err)}`);
          }
          
          completedBatches++;
          const progress = Math.floor((completedBatches / batches) * 100);
          setProgressValue(progress);
          
          // Atualizar o progresso
          setSuccessMessage(`Progress: ${completedBatches}/${batches} batches completed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setError('Error processing transaction: ' + txError.message);
          break;
        }
      }
      
      // Esperar um pouco para que as atualizações sejam refletidas na blockchain
      if (completedBatches === batches) {
        setSuccessMessage('Transactions completed. Waiting for blockchain propagation (5 seconds)...');
        
        // Esperar 5 segundos para garantir que as transações estejam confirmadas e propagadas
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setSuccessMessage('Verifying actual balances on blockchain...');
        
        // Atualizar o banco de dados com os novos saldos direto da blockchain
        await updateBalancesInDatabase();
        
        // Atualizar a interface com a mensagem de sucesso final
        setSuccessMessage(`${solAmount} SOL distributed successfully! Each wallet received approximately ${amountPerWallet.toFixed(4)} SOL.`);
      } else {
        setError(`Apenas ${completedBatches} de ${batches} lotes foram processados. Verificando saldos atualizados...`);
        // Tenta atualizar os saldos mesmo em caso de erro parcial
        await updateBalancesInDatabase();
      }
      
      // Buscar carteiras atualizadas
      fetchWallets();
    } catch (error) {
      console.error('Erro completo:', error);
      setError('Failed to fund wallets: ' + (error.response?.data?.error || error.message));
      
      // Tentar verificar os saldos mesmo em caso de erro
      try {
        await updateBalancesInDatabase();
        setSuccessMessage('Saldos atualizados após erro. Verifique se as transações foram confirmadas.');
      } catch (updateError) {
        console.error('Erro ao atualizar saldos após falha:', updateError);
      }
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const buyTokens = async () => {
    if (!selectedToken) {
      setError('Please select a token first');
      return;
    }
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    if (!connection) {
      setError('Wallet connection not available. Please reconnect your wallet.');
      return;
    }
    
    // Validar a percentagem de tokens
    const percentage = parseFloat(tokenPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setError('Por favor, insira uma percentagem válida entre 0 e 100');
      return;
    }
    
    // Encontrar o token selecionado para obter o saldo disponível
    const selectedTokenInfo = masterTokens.find(t => t.mint === selectedToken);
    if (!selectedTokenInfo) {
      setError('Token information not found');
      return;
    }
    
    // Calcular o montante total disponível e quanto será enviado por carteira
    const availableBalance = selectedTokenInfo.balance;
    const totalToDistribute = (availableBalance * percentage) / 100;
    const amountPerWallet = totalToDistribute / wallets.length;
    
    if (amountPerWallet <= 0) {
      setError(`Saldo insuficiente para distribuir ${percentage}% entre ${wallets.length} carteiras`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgressValue(0);
    setIsProcessing(true);
    
    try {
      // Mostrar mensagem de início do processo
      setSuccessMessage(`Preparando distribuição de ${percentage}% dos tokens (${totalToDistribute.toFixed(2)} ${selectedTokenInfo.symbol}) para ${wallets.length} carteiras...`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/buy-tokens`, { 
        tokenAddress: selectedToken,
        masterAddress: publicKey.toString(),
        fixedAmount: amountPerWallet.toString() // Enviar o valor calculado por carteira
      });

      const { transactions, totalTokens, batches, tokenSymbol, tokenName } = response.data;
      let completedBatches = 0;
      
      if (!transactions || transactions.length === 0) {
        setError('No transactions were generated. Please try again.');
        setLoading(false);
        setIsProcessing(false);
        return;
      }
      
      setSuccessMessage(`Preparado para enviar ${totalTokens.toFixed(2)} ${tokenSymbol} para ${wallets.length} carteiras em ${batches} lotes.`);
      
      // Processar cada transação em sequência
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processando lote ${index + 1} de ${transactions.length}...`);
          
          // Converter base64 para Uint8Array
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          const transaction = Transaction.from(txBytes);
          
          if (!transaction) {
            throw new Error('Failed to parse transaction');
          }
          
          // Assinar a transação
          const signedTx = await signTransaction(transaction);
          
          if (!signedTx) {
            throw new Error('Failed to sign transaction');
          }
          
          if (!connection) {
            throw new Error('Connection is not available');
          }
          
          // Enviar a transação
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          
          // Confirmar a transação usando a abordagem não depreciada
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedBatches++;
          const progress = Math.floor((completedBatches / batches) * 100);
          setProgressValue(progress);
          
          // Atualizar o progresso
          setSuccessMessage(`Progress: ${completedBatches}/${batches} batches completed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setError('Error processing transaction: ' + (txError.message || 'Unknown error'));
          break;
        }
      }
      
      if (completedBatches === batches) {
        // Atualizar o banco de dados com os novos saldos
        await updateBalancesInDatabase();
        
        // Atualizar a interface com a mensagem de sucesso final
        setSuccessMessage(
          `Compra de tokens concluída com sucesso! Total de ${totalTokens.toFixed(2)} ${tokenSymbol} (${tokenName}) distribuídos, ${percentage}% do saldo disponível.`
        );
      }
      
      // Buscar carteiras atualizadas
      fetchWallets();
      // Atualizar tokens mestre para refletir o novo saldo
      fetchMasterTokens();
    } catch (error) {
      setError('Failed to buy tokens: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      console.error('Buy tokens error:', error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const sellAllTokens = async () => {
    if (!selectedToken) {
      setError('Please select a token first');
      return;
    }
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgressValue(0);
    setIsProcessing(true);
    
    try {
      // Get selected token info for better UI feedback
      const selectedTokenInfo = masterTokens.find(t => t.mint === selectedToken);
      const tokenSymbol = selectedTokenInfo?.symbol || "selected token";
      
      // Show initial message
      setSuccessMessage(`Preparing to collect all ${tokenSymbol} and SOL from shadow wallets...`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sell-tokens`, {
        tokenAddress: selectedToken,
        masterAddress: publicKey.toString(),
        includeSol: true // Enable SOL collection as well
      });

      const { 
        transactions, 
        totalTokensCollected, 
        totalSolCollected,
        walletsWithTokens, 
        walletsWithSol,
        tokenSymbol: responseSymbol 
      } = response.data;
      
      if (!transactions || transactions.length === 0) {
        setSuccessMessage('No assets found in shadow wallets to collect.');
        setLoading(false);
        setIsProcessing(false);
        return;
      }
      
      // Prepare status message showing both token and SOL amounts
      const collectionSummary = [];
      if (walletsWithTokens > 0) {
        collectionSummary.push(`${totalTokensCollected} ${responseSymbol} from ${walletsWithTokens} wallets`);
      }
      if (walletsWithSol > 0) {
        collectionSummary.push(`${totalSolCollected.toFixed(4)} SOL from ${walletsWithSol} wallets`);
      }
      
      setSuccessMessage(`Ready to collect ${collectionSummary.join(' and ')}.`);
      
      let completedTransactions = 0;
      const totalTransactions = transactions.length;
      
      // Process each transaction sequentially
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processing transaction ${index + 1} of ${totalTransactions}...`);
          
          // Convert base64 to Uint8Array
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          
          // Send the transaction (since it's already pre-signed in the backend)
          const signature = await connection.sendRawTransaction(txBytes);
          
          // Confirm the transaction
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedTransactions++;
          const progress = Math.floor((completedTransactions / totalTransactions) * 100);
          setProgressValue(progress);
          
          // Update progress
          setSuccessMessage(`Progress: ${completedTransactions}/${totalTransactions} transactions processed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          // Log error but continue with other transactions
          console.log(`Error processing transaction ${index + 1}:`, txError);
        }
      }
      
      if (completedTransactions > 0) {
        // Wait a moment for blockchain to propagate changes
        setSuccessMessage('Waiting for blockchain to update (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Update database with new balances
        setSuccessMessage('Syncing wallet balances with blockchain...');
        await updateBalancesInDatabase();
        
        // Create success message summarizing results
        const successSummary = [];
        if (walletsWithTokens > 0) {
          successSummary.push(`${totalTokensCollected} ${responseSymbol}`);
        }
        if (walletsWithSol > 0) {
          successSummary.push(`${totalSolCollected.toFixed(4)} SOL`);
        }
        
        // Update the UI with success message
        setSuccessMessage(
          `Successfully collected ${successSummary.join(' and ')} from shadow wallets! ${completedTransactions} of ${totalTransactions} transactions were successful.`
        );
      }
      
      // Refresh wallets and master tokens to show updated balances
      fetchWallets();
      fetchMasterTokens();
    } catch (error) {
      setError('Failed to collect assets: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      console.error('Sell tokens error:', error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const collectSol = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgressValue(0);
    setIsProcessing(true);
    
    try {
      // Show initial message
      setSuccessMessage(`Preparing to collect SOL from shadow wallets...`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/collect-sol`, {
        masterAddress: publicKey.toString()
      });

      const { 
        transactions, 
        totalSolCollected,
        walletsWithSol,
      } = response.data;
      
      if (!transactions || transactions.length === 0) {
        setSuccessMessage('No SOL found in shadow wallets to collect.');
        setLoading(false);
        setIsProcessing(false);
        return;
      }
      
      setSuccessMessage(`Ready to collect ${totalSolCollected.toFixed(4)} SOL from ${walletsWithSol} wallets.`);
      
      let completedTransactions = 0;
      const totalTransactions = transactions.length;
      
      // Process each transaction sequentially
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processing transaction ${index + 1} of ${totalTransactions}...`);
          
          // Convert base64 to Uint8Array
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          
          // Send the transaction (since it's already pre-signed in the backend)
          const signature = await connection.sendRawTransaction(txBytes);
          
          // Confirm the transaction
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedTransactions++;
          const progress = Math.floor((completedTransactions / totalTransactions) * 100);
          setProgressValue(progress);
          
          // Update progress
          setSuccessMessage(`Progress: ${completedTransactions}/${totalTransactions} transactions processed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          // Log error but continue with other transactions
          console.log(`Error processing transaction ${index + 1}:`, txError);
        }
      }
      
      if (completedTransactions > 0) {
        // Wait a moment for blockchain to propagate changes
        setSuccessMessage('Waiting for blockchain to update (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Update database with new balances
        setSuccessMessage('Syncing wallet balances with blockchain...');
        await updateBalancesInDatabase();
        
        // Update the UI with success message
        setSuccessMessage(
          `Successfully collected ${totalSolCollected.toFixed(4)} SOL from shadow wallets! ${completedTransactions} of ${totalTransactions} transactions were successful.`
        );
      }
      
      // Refresh wallets to show updated balances
      fetchWallets();
    } catch (error) {
      setError('Failed to collect SOL: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      console.error('Collect SOL error:', error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  // Função para atualizar saldos no banco de dados
  const updateBalancesInDatabase = async () => {
    try {
      // Primeiro, buscar os saldos reais na blockchain para garantir precisão
      const connection = new Connection(process.env.REACT_APP_SOLANA_RPC || "https://api.devnet.solana.com");
      const addresses = wallets.map(w => w.address);
      const solBalances = [];
      const tokenBalances = wallets.map(w => w.tokenBalance);

      setSuccessMessage("Consultando saldos de SOL na blockchain...");
      console.log("Buscando saldos para", addresses.length, "carteiras");
      
      // Buscar saldos de SOL atualizados da blockchain em lotes para evitar muitas requisições
      const QUERY_BATCH_SIZE = 5;
      for (let i = 0; i < addresses.length; i += QUERY_BATCH_SIZE) {
        const batchAddresses = addresses.slice(i, i + QUERY_BATCH_SIZE);
        const progress = Math.floor((i / addresses.length) * 100);
        setProgressValue(progress);
        
        // Processar cada endereço no lote
        const batchPromises = batchAddresses.map(async (address) => {
          try {
            const publicKey = new PublicKey(address);
            const balance = await connection.getBalance(publicKey);
            return balance / 1e9; // Converter lamports para SOL
          } catch (err) {
            console.error(`Error fetching balance for ${address}:`, err);
            return 0;
          }
        });
        
        // Aguardar todos no lote antes de continuar
        const batchResults = await Promise.all(batchPromises);
        solBalances.push(...batchResults);
      }
      
      setProgressValue(100);
      setSuccessMessage("Saldos consultados. Atualizando banco de dados...");
      
      console.log("Saldos encontrados:", solBalances);
      
      // Enviar para o backend
      const result = await axios.post(`${process.env.REACT_APP_API_URL}/api/update-balances`, {
        addresses,
        solBalances,
        tokenBalances
      });
      
      console.log("Resposta do backend:", result.data);
      
      // Atualizar o estado local com os novos saldos
      const updatedWallets = wallets.map((wallet, index) => ({
        ...wallet,
        solBalance: solBalances[index]
      }));
      
      setWallets(updatedWallets);
      
      console.log('Balances updated in database with real blockchain data');
      return true;
    } catch (error) {
      console.error('Failed to update balances in database:', error);
      throw error;
    }
  };

  // Função para verificar os saldos diretamente na blockchain
  const verifyBalances = async () => {
    if (wallets.length === 0) {
      setError('No wallets to verify');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('Verifying balances on blockchain...');
    setIsProcessing(true);
    setProgressValue(0);
    
    try {
      // Primeiro verificar saldos de SOL
      await updateBalancesInDatabase();
      setSuccessMessage('SOL balances updated. Verifying tokens...');
      setProgressValue(30);

      // Now verify ALL tokens for each wallet
      const addresses = wallets.map(w => w.address);
      const tokenMints = new Set();
      
      // Collect all unique token mints from wallets
      wallets.forEach(wallet => {
        if (wallet.tokens && wallet.tokens.length > 0) {
          wallet.tokens.forEach(token => {
            if (token.mint) tokenMints.add(token.mint);
          });
        }
      });

      setProgressValue(40);
      setSuccessMessage(`Checking ${tokenMints.size} token types in ${addresses.length} wallets...`);
      
      // Process each token type
      let processedTokens = 0;
      for (const tokenMint of tokenMints) {
        try {
          await axios.post(`${process.env.REACT_APP_API_URL}/api/verify-token-balances`, {
            walletAddresses: addresses,
            tokenMint: tokenMint
          });
          
          processedTokens++;
          const tokenProgress = 40 + Math.floor((processedTokens / tokenMints.size) * 50);
          setProgressValue(tokenProgress);
          setSuccessMessage(`Verified ${processedTokens} of ${tokenMints.size} token types...`);
        } catch (tokenError) {
          console.error(`Failed to verify token balances for ${tokenMint}:`, tokenError);
        }
      }
      
      setProgressValue(100);
      setSuccessMessage('All balances successfully updated!');

      // Buscar carteiras atualizadas do backend para garantir consistência
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallets`);
      setWallets(response.data.wallets);
      
    } catch (error) {
      setError('Error verifying balances: ' + error.message);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openWalletInfo = (wallet) => {
    setSelectedWallet(wallet);
    setWalletDialogOpen(true);
  };

  // Calculate total token amount for a wallet - already properly implemented
  const calculateTotalTokenAmount = (wallet) => {
    if (!wallet.tokens || wallet.tokens.length === 0) return 0;
    return wallet.tokens.reduce((sum, token) => sum + (token.amount || 0), 0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Add this function alongside your other utility functions
  const getActiveTokenCount = (wallet) => {
    if (!wallet.tokens || wallet.tokens.length === 0) return 0;
    return wallet.tokens.filter(t => t.amount > 0).length;
  };

  return (
    <ChaosPaper>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#92E643', fontWeight: 'bold' }}>
          Manage Wallets
        </Typography>

        {/* Área de criação de carteiras */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 2,
          alignItems: 'flex-start',
          mb: 3
        }}>
          <ActionButton 
            variant="contained" 
            onClick={generateWallets}
            disabled={loading || !publicKey}
            startIcon={loading && <CircularProgress size={20} />}
          >
            Create 30 Wallets
          </ActionButton>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#92E643', 
              mt: 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {walletStats.totalWallets > 0 ? 
              `Wallets: ${walletStats.totalWallets}` : 
              "No wallets created"}
          </Typography>
        </Box>

        {/* Área para adicionar SOL */}
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#92E643' }}>
            Add SOL
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 2 
          }}>
            <TextField
              type="number"
              label="SOL Amount"
              value={solAmount}
              onChange={(e) => setSolAmount(e.target.value)}
              size="small"
              sx={{
                minWidth: '120px',
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#92E643' },
                },
                '& .MuiInputLabel-root': { color: '#92E643' },
              }}
            />
            <ActionButton 
              variant="contained" 
              onClick={fundWallets}
              disabled={loading || !publicKey || wallets.length === 0 || parseFloat(solAmount) <= 0}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Drip SOL
            </ActionButton>
            <ActionButton 
              variant="contained" 
              onClick={collectSol}
              disabled={loading || !publicKey || wallets.length === 0}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Collect SOL
            </ActionButton>
          </Box>
        </Paper>

        {/* Área para comprar tokens */}
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#92E643' }}>
            Buy/Sell Tokens
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <FormControl 
              fullWidth
              variant="outlined" 
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: '#92E643' },
                },
                '& .MuiInputLabel-root': { color: '#92E643' },
              }}
            >
              <InputLabel>Select Token</InputLabel>
              <Select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                label="Select Token"
                sx={{
                  '& .MuiSelect-icon': { color: '#92E643' },
                  '& .MuiSvgIcon-root': { color: '#92E643' },
                }}
              >
                {masterTokens.map((token) => (
                  <MenuItem key={token.mint} value={token.mint} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', mr: 1 }}>
                        {token.symbol}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {token.name}
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 'auto', color: 'success.main' }}>
                        {token.balance}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                      {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2
            }}>
              <TextField
                type="number"
                label="Token Percentage"
                value={tokenPercentage}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (isNaN(value)) {
                    setTokenPercentage('');
                  } else if (value > 100) {
                    setTokenPercentage('100');
                  } else if (value < 0) {
                    setTokenPercentage('0');
                  } else {
                    setTokenPercentage(e.target.value);
                  }
                }}
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                sx={{
                  minWidth: '140px',
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#92E643' },
                  },
                  '& .MuiInputLabel-root': { color: '#92E643' },
                  '& .MuiInputAdornment-root': { color: '#92E643' },
                }}
              />
              <ActionButton 
                variant="contained" 
                onClick={buyTokens}
                disabled={loading || wallets.length === 0 || !selectedToken || parseFloat(tokenPercentage) <= 0}
                startIcon={loading && <CircularProgress size={20} />}
              >
                Buy Tokens
              </ActionButton>
              <ActionButton 
                variant="contained" 
                onClick={sellAllTokens}
                disabled={!selectedToken || loading}
                startIcon={loading && <CircularProgress size={20} />}
              >
                Collect Tokens
              </ActionButton>
            </Box>
          </Box>
        </Paper>
        
        {/* Verificar saldos */}
        <Box sx={{ mb: 3 }}>
          <ActionButton 
            variant="outlined" 
            onClick={verifyBalances}
            disabled={loading || wallets.length === 0}
            fullWidth
          >
            Verify Balances
          </ActionButton>
        </Box>

        {/* Mensagens de status */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {isProcessing && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressValue} 
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(146, 230, 67, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#92E643',
                  borderRadius: 5,
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#92E643', mt: 1 }}>
              {progressValue}% Complete
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Paper 
          sx={{ 
            width: '100%', 
            overflow: 'hidden',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              p: 2, 
              color: '#92E643', 
              borderBottom: '1px solid rgba(146, 230, 67, 0.2)' 
            }}
          >
            Wallet List
          </Typography>
          
          <Box>
            <Table aria-label="shadow wallets table" size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#92E643',
                    borderBottom: '1px solid rgba(146, 230, 67, 0.2)'
                  }}>
                    Address
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#92E643',
                    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
                    width: '80px',
                    textAlign: 'right'
                  }}>
                    SOL
                  </TableCell>
                  <TableCell align="center" sx={{ 
                    color: getActiveTokenCount(wallets) > 0 ? '#92E643' : '#fff',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    Token Count
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#92E643',
                    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
                    width: '120px',
                    textAlign: 'right'
                  }}>
                    Total Amount
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#92E643',
                    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
                    width: '100px',
                    textAlign: 'right'
                  }}>
                    Value
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: '#92E643', 
                    width: '100px',
                    borderBottom: '1px solid rgba(146, 230, 67, 0.2)',
                    textAlign: 'center'
                  }}>
                    Info
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {wallets
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((wallet) => {
                  // Pegar o token principal se existir (primeiro do array ou o mais recente)
                  const primaryToken = wallet.tokens && wallet.tokens.length > 0 
                    ? wallet.tokens.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))[0] 
                    : null;
                  
                  // Calculate total amount across all tokens
                  const totalTokenAmount = calculateTotalTokenAmount(wallet);
                  
                  return (
                    <TableRow 
                      key={wallet.address}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { backgroundColor: 'rgba(146, 230, 67, 0.05)' }
                      }}
                    >
                      <TableCell 
                        component="th" 
                        scope="row"
                        sx={{ 
                          color: '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            maxWidth: { xs: '120px', sm: '180px', md: '220px' }
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {wallet.address}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(wallet.address)}
                            sx={{ color: '#92E643', ml: 1 }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: wallet.solBalance > 0 ? '#92E643' : '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {wallet.solBalance ? wallet.solBalance.toFixed(4) : '0'}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          color: getActiveTokenCount(wallet) > 0 ? '#92E643' : '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {getActiveTokenCount(wallet)}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: totalTokenAmount > 0 ? '#92E643' : '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {totalTokenAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: primaryToken && primaryToken.amount > 0 ? '#92E643' : '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        {primaryToken ? `${primaryToken.symbol || '-'}` : '-'}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => openWalletInfo(wallet)}
                            sx={{ color: '#92E643' }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Add Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 20, 30]}
              component="div"
              count={wallets.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                color: '#fff',
                '& .MuiTablePagination-selectIcon': {
                  color: '#92E643',
                },
                '& .MuiTablePagination-select': {
                  color: '#92E643',
                },
                '& .MuiTablePagination-actions': {
                  color: '#92E643',
                },
                '& .MuiIconButton-root.Mui-disabled': {
                  color: 'rgba(146, 230, 67, 0.3)',
                },
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Dialog 
        open={walletDialogOpen} 
        onClose={() => setWalletDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#111',
            color: '#fff',
            border: '1px solid #92E643',
            borderRadius: 2,
            maxWidth: '700px',
            width: '100%'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(146, 230, 67, 0.3)',
          color: '#92E643',
          fontWeight: 'bold',
        }}>
          Wallet Details
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          {selectedWallet && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#92E643', mb: 1 }}>
                  Address
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {selectedWallet.address}
                  </Typography>
                  <Box sx={{ display: 'flex', ml: 2 }}>
                    <Tooltip title="Copy Address">
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(selectedWallet.address)}
                        sx={{ color: '#92E643', mr: 1 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View in Solana Explorer">
                      <IconButton 
                        size="small" 
                        component="a"
                        href={`https://explorer.solana.com/address/${selectedWallet.address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: '#92E643' }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#92E643', mb: 1 }}>
                  SOL Balance
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: selectedWallet.solBalance > 0 ? '#92E643' : '#fff' }}>
                  {selectedWallet.solBalance ? selectedWallet.solBalance.toFixed(6) : '0'} SOL
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#92E643', mb: 1 }}>
                  Tokens ({getActiveTokenCount(selectedWallet)})
                </Typography>
                
                {selectedWallet.tokens && selectedWallet.tokens.length > 0 ? (
                  <Table size="small" sx={{ 
                    backgroundColor: 'rgba(0,0,0,0.2)', 
                    borderRadius: 1,
                    overflow: 'hidden',
                    '& th, & td': {
                      border: 'none',
                      borderBottom: '1px solid rgba(146, 230, 67, 0.1)',
                      padding: '8px 16px',
                    },
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#92E643', fontWeight: 'bold' }}>Token</TableCell>
                        <TableCell sx={{ color: '#92E643', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                        <TableCell sx={{ color: '#92E643', fontWeight: 'bold' }} align="right">Symbol</TableCell>
                        <TableCell sx={{ color: '#92E643', fontWeight: 'bold' }} align="center">Links</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedWallet.tokens.map((token, index) => (
                        <TableRow key={index}>
                          <TableCell 
                            sx={{ 
                              color: '#fff',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Tooltip title={`${token.name} (${token.mint})`}>
                              <Typography variant="body2">
                                {token.name}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell 
                            align="right"
                            sx={{ color: token.amount > 0 ? '#92E643' : '#fff' }}
                          >
                            {token.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                          </TableCell>
                          <TableCell 
                            align="right"
                            sx={{ color: '#92E643' }}
                          >
                            {token.symbol}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                              <Tooltip title="View in Solana Explorer">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`https://explorer.solana.com/address/${token.mint}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ color: '#92E643' }}
                                >
                                  <img 
                                      src="./SolanaExplorer.png" 
                                      alt="SolScan" 
                                      style={{ width: 18, height: 18, borderRadius: 8 }} 
                                    />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View in Solscan">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ color: '#92E643' }}
                                >
                                  <img 
                                      src="https://solscan.io/favicon.ico" 
                                      alt="SolScan" 
                                      style={{ width: 16, height: 16 }} 
                                    />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" sx={{ color: '#aaa', fontStyle: 'italic' }}>
                    No tokens found for this wallet.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(146, 230, 67, 0.3)' }}>
          <ActionButton onClick={() => setWalletDialogOpen(false)}>
            Close
          </ActionButton>
        </DialogActions>
      </Dialog>
    </ChaosPaper>
  );
};

export default WalletManager;