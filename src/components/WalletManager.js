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
  TablePagination,
  Chip
} from '@mui/material';
import { styled } from '@mui/system';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';

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
  const [tokenPage, setTokenPage] = useState(0);
  const [hasMoreTokens, setHasMoreTokens] = useState(true);
  const [loadingMoreTokens, setLoadingMoreTokens] = useState(false);
  const [walletPage, setWalletPage] = useState(0);
  const [hasMoreWallets, setHasMoreWallets] = useState(true);
  const [loadingMoreWallets, setLoadingMoreWallets] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dbStatus, setDbStatus] = useState('unknown'); // 'connected', 'disconnected', 'checking'
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const generateMockData = (count = 5) => {
    const mockWallets = [];
    for (let i = 0; i < count; i++) {
      mockWallets.push({
        address: `mock${i}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`,
        solBalance: parseFloat((Math.random() * 0.5).toFixed(4)),
        tokenBalance: Math.floor(Math.random() * 1000),
        tokens: [
          {
            mint: "mocktoken1",
            amount: Math.floor(Math.random() * 100),
            symbol: "MOCK",
            name: "Mock Token"
          }
        ]
      });
    }
    return mockWallets;
  };

  const fetchWallets = async (nextPage = 0, retryCount = 0) => {
    setIsLoadingData(true);
    try {
      setLoadingMoreWallets(nextPage > 0);

      console.log(`Buscando carteiras (página ${nextPage})`);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallets`, {
        params: { page: nextPage, pageSize: 10 },
        timeout: 10000
      });

      if (nextPage === 0) {
        setWallets(response.data.wallets || []);
      } else {
        setWallets(prev => [...prev, ...(response.data.wallets || [])]);
      }

      setWalletStats({
        totalWallets: response.data.pagination?.total || response.data.wallets?.length || 0,
        fromDatabase: (response.data.wallets?.length || 0) > 0
      });
      setWalletPage(nextPage);
      setHasMoreWallets(response.data.pagination?.hasMore || false);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);

      if (error.response?.status === 503) {
        console.log("MongoDB unavailable - database connection error");
        setError('Database unavailable. Please try again later when connection is restored.');
        setWallets([]);
        setWalletStats({
          totalWallets: 0,
          fromDatabase: false
        });
        setHasMoreWallets(false);
        setDbStatus('disconnected'); // Update DB status indicator
        
        // Try reconnecting after some time
        setTimeout(() => {
          console.log("Attempting to reconnect to database...");
          fetchWallets(0);
        }, 15000);
      } else if ((error.response?.status === 408 || error.response?.status === 504) && retryCount < 3) {
        console.log(`Timeout ocorreu, tentando novamente (${retryCount + 1}/3)...`);
        setTimeout(() => fetchWallets(nextPage, retryCount + 1), 2000);
      } else if (retryCount >= 3) {
        setWallets(prev => nextPage === 0 ? [] : prev);
        setHasMoreWallets(false);
        setError('Não foi possível carregar as carteiras após várias tentativas.');
      }
    } finally {
      setLoadingMoreWallets(false);
      setIsLoadingData(false);
    }
  };

  const fetchMasterTokens = async (nextPage = 0, retryCount = 0) => {
    if (!publicKey) return;
    setIsLoadingData(true);
    try {
      setLoadingMoreTokens(nextPage > 0);

      console.log(`Buscando tokens para ${publicKey.toString()} (página ${nextPage})`);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/master-tokens/${publicKey.toString()}`,
        { params: { page: nextPage, pageSize: 10 }, timeout: 15000 }
      );

      const tokens = response.data?.tokens || [];
      const tokensWithBalance = tokens.filter(token => token && typeof token.balance === 'number' && token.balance > 0);

      if (nextPage === 0) {
        setMasterTokens(tokensWithBalance);
      } else {
        setMasterTokens(prev => [...prev, ...tokensWithBalance]);
      }

      setTokenPage(nextPage);
      setHasMoreTokens(response.data?.pagination?.hasMore || false);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch master tokens:', error);

      if (error.response?.status === 503) {
        setError('Database unavailable. Please try again later.');
        setMasterTokens([]);
        setHasMoreTokens(false);
      } else if ((error.response?.status === 408 || error.response?.status === 504) && retryCount < 3) {
        console.log(`Timeout ocorreu, tentando novamente (${retryCount + 1}/3)...`);
        setTimeout(() => fetchMasterTokens(nextPage, retryCount + 1), 2000);
      } else {
        setMasterTokens(prev => nextPage === 0 ? [] : prev);
        setHasMoreTokens(false);
        setError('Não foi possível carregar os tokens após várias tentativas.');
      }
    } finally {
      setLoadingMoreTokens(false);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchMasterTokens();
  }, [publicKey]);

  useEffect(() => {
    fetchWallets(0);
  }, []);

  const generateWallets = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/generate-wallets`, {
        count: walletsToCreate
      });
      
      setWallets(response.data.wallets);
      setWalletStats({
        totalWallets: response.data.wallets.length,
        fromDatabase: response.data.fromDatabase,
        newlyCreated: response.data.newlyCreated || 0
      });
      
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
      
      // Add this check to prevent the error
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        setError('No valid transactions received from server. Please try again.');
        setLoading(false);
        setIsProcessing(false);
        return;
      }
      
      let completedBatches = 0;
      const signatures = [];
      
      for (const txBase64 of transactions) {
        try {
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          const transaction = Transaction.from(txBytes);
          
          setSuccessMessage(`Signing transaction ${completedBatches + 1}/${batches}...`);
          const signedTx = await signTransaction(transaction);
          
          setSuccessMessage(`Sending transaction ${completedBatches + 1}/${batches}...`);
          const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          
          signatures.push(signature);
          setSuccessMessage(`Waiting for confirmation of transaction ${completedBatches + 1}/${batches}...`);
          
          const latestBlockhash = await connection.getLatestBlockhash();
          const confirmationResponse = await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          if (confirmationResponse.value.err) {
            throw new Error(`Erro de confirmação: ${JSON.stringify(confirmationResponse.value.err)}`);
          }
          
          const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });
          
          if (status.value && status.value.err) {
            throw new Error(`Transação falhou: ${JSON.stringify(status.value.err)}`);
          }
          
          completedBatches++;
          const progress = Math.floor((completedBatches / batches) * 100);
          setProgressValue(progress);
          
          setSuccessMessage(`Progress: ${completedBatches}/${batches} batches completed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setError('Error processing transaction: ' + txError.message);
          break;
        }
      }
      
      if (completedBatches === batches) {
        setSuccessMessage('Transactions completed. Waiting for blockchain propagation (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setSuccessMessage('Verifying actual balances on blockchain...');
        await updateBalancesInDatabase();
        
        setSuccessMessage(`${solAmount} SOL distributed successfully! Each wallet received approximately ${amountPerWallet.toFixed(4)} SOL.`);
      } else {
        setError(`Apenas ${completedBatches} de ${batches} lotes foram processados. Verificando saldos atualizados...`);
        await updateBalancesInDatabase();
      }
      
      fetchWallets(0);
    } catch (error) {
      console.error('Erro completo:', error);
      setError('Failed to fund wallets: ' + (error.response?.data?.error || error.message));
      
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
    
    const percentage = parseFloat(tokenPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setError('Por favor, insira uma percentagem válida entre 0 e 100');
      return;
    }
    
    const selectedTokenInfo = masterTokens.find(t => t.mint === selectedToken);
    if (!selectedTokenInfo) {
      setError('Token information not found');
      return;
    }
    
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
      setSuccessMessage(`Preparando distribuição de ${percentage}% dos tokens (${totalToDistribute.toFixed(2)} ${selectedTokenInfo.symbol}) para ${wallets.length} carteiras...`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/buy-tokens`, { 
        tokenAddress: selectedToken,
        masterAddress: publicKey.toString(),
        fixedAmount: amountPerWallet.toString()
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
      
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processando lote ${index + 1} de ${transactions.length}...`);
          
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          const transaction = Transaction.from(txBytes);
          
          if (!transaction) {
            throw new Error('Failed to parse transaction');
          }
          
          const signedTx = await signTransaction(transaction);
          
          if (!signedTx) {
            throw new Error('Failed to sign transaction');
          }
          
          if (!connection) {
            throw new Error('Connection is not available');
          }
          
          const signature = await connection.sendRawTransaction(signedTx.serialize());
          
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedBatches++;
          const progress = Math.floor((completedBatches / batches) * 100);
          setProgressValue(progress);
          
          setSuccessMessage(`Progress: ${completedBatches}/${batches} batches completed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          setError('Error processing transaction: ' + (txError.message || 'Unknown error'));
          break;
        }
      }
      
      if (completedBatches === batches) {
        await updateBalancesInDatabase();
        
        setSuccessMessage(
          `Compra de tokens concluída com sucesso! Total de ${totalTokens.toFixed(2)} ${tokenSymbol} (${tokenName}) distribuídos, ${percentage}% do saldo disponível.`
        );
      }
      
      fetchWallets(0);
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
      const selectedTokenInfo = masterTokens.find(t => t.mint === selectedToken);
      const tokenSymbol = selectedTokenInfo?.symbol || "selected token";
      
      setSuccessMessage(`Preparing to collect all ${tokenSymbol} and SOL from shadow wallets...`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/sell-tokens`, {
        tokenAddress: selectedToken,
        masterAddress: publicKey.toString(),
        includeSol: true
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
      
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processing transaction ${index + 1} of ${totalTransactions}...`);
          
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          
          const signature = await connection.sendRawTransaction(txBytes);
          
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedTransactions++;
          const progress = Math.floor((completedTransactions / totalTransactions) * 100);
          setProgressValue(progress);
          
          setSuccessMessage(`Progress: ${completedTransactions}/${totalTransactions} transactions processed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          console.log(`Error processing transaction ${index + 1}:`, txError);
        }
      }
      
      if (completedTransactions > 0) {
        setSuccessMessage('Waiting for blockchain to update (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setSuccessMessage('Syncing wallet balances with blockchain...');
        await updateBalancesInDatabase();
        
        const successSummary = [];
        if (walletsWithTokens > 0) {
          successSummary.push(`${totalTokensCollected} ${responseSymbol}`);
        }
        if (walletsWithSol > 0) {
          successSummary.push(`${totalSolCollected.toFixed(4)} SOL`);
        }
        
        setSuccessMessage(
          `Successfully collected ${successSummary.join(' and ')} from shadow wallets! ${completedTransactions} of ${totalTransactions} transactions were successful.`
        );
      }
      
      fetchWallets(0);
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
      
      for (const [index, txBase64] of transactions.entries()) {
        try {
          setSuccessMessage(`Processing transaction ${index + 1} of ${totalTransactions}...`);
          
          const txBytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));
          
          const signature = await connection.sendRawTransaction(txBytes);
          
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          });
          
          completedTransactions++;
          const progress = Math.floor((completedTransactions / totalTransactions) * 100);
          setProgressValue(progress);
          
          setSuccessMessage(`Progress: ${completedTransactions}/${totalTransactions} transactions processed (${progress}%)...`);
        } catch (txError) {
          console.error('Transaction error:', txError);
          console.log(`Error processing transaction ${index + 1}:`, txError);
        }
      }
      
      if (completedTransactions > 0) {
        setSuccessMessage('Waiting for blockchain to update (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setSuccessMessage('Syncing wallet balances with blockchain...');
        await updateBalancesInDatabase();
        
        setSuccessMessage(
          `Successfully collected ${totalSolCollected.toFixed(4)} SOL from shadow wallets! ${completedTransactions} of ${totalTransactions} transactions were successful.`
        );
      }
      
      fetchWallets(0);
    } catch (error) {
      setError('Failed to collect SOL: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      console.error('Collect SOL error:', error);
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const updateBalancesInDatabase = async (retryCount = 0) => {
    if (wallets.length === 0) {
      return;
    }
    
    try {
      setSuccessMessage("Consultando saldos de SOL na blockchain...");
      console.log("Buscando saldos para", wallets.length, "carteiras");
      
      const addresses = wallets.map(w => w.address);
      const QUERY_BATCH_SIZE = 5;
      const solBalances = [];
      
      for (let i = 0; i < addresses.length; i += QUERY_BATCH_SIZE) {
        const batchAddresses = addresses.slice(i, i + QUERY_BATCH_SIZE);
        const progress = Math.floor((i / addresses.length) * 100);
        setProgressValue(progress);
        
        const batchPromises = batchAddresses.map(async (address) => {
          try {
            const publicKey = new PublicKey(address);
            const balance = await Promise.race([
              connection.getBalance(publicKey),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
              )
            ]);
            return balance / 1e9;
          } catch (err) {
            console.error(`Error fetching balance for ${address}:`, err);
            return 0;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        solBalances.push(...batchResults);
        
        if (i + QUERY_BATCH_SIZE < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      setProgressValue(100);
      
      console.log("Enviando saldos para o servidor...");
      await axios.post(`${process.env.REACT_APP_API_URL}/api/update-balances`, {
        addresses,
        solBalances
      }, {
        timeout: 10000
      });
      
      setSuccessMessage("Saldos de SOL atualizados com sucesso!");
      console.log("Balances updated in database");
    } catch (error) {
      console.error('Failed to update balances in database:', error);
      
      if ((error.response?.status === 408 || error.response?.status === 504) && retryCount < 2) {
        console.log(`Timeout ao atualizar saldos, tentando novamente (${retryCount + 1}/2)...`);
        setSuccessMessage(`Timeout ao atualizar saldos. Tentando novamente (${retryCount + 1}/2)...`);
        return updateBalancesInDatabase(retryCount + 1);
      }
      
      setError('Erro ao atualizar saldos: ' + (error.response?.data?.error || error.message));
      throw error;
    }
  };

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
      await updateBalancesInDatabase();
      setSuccessMessage('SOL balances updated. Verifying tokens...');
      setProgressValue(30);

      const addresses = wallets.map(w => w.address);
      const tokenMints = new Set();
      
      wallets.forEach(wallet => {
        if (wallet.tokens && wallet.tokens.length > 0) {
          wallet.tokens.forEach(token => {
            if (token.mint) tokenMints.add(token.mint);
          });
        }
      });

      setProgressValue(40);
      setSuccessMessage(`Checking ${tokenMints.size} token types in ${addresses.length} wallets...`);
      
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

  const calculateTotalTokenAmount = (wallet) => {
    if (!wallet || !wallet.tokens || !Array.isArray(wallet.tokens)) return 0;
    return wallet.tokens.reduce((sum, token) => {
      if (!token || typeof token.amount !== 'number') return sum;
      return sum + token.amount;
    }, 0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getActiveTokenCount = (wallet) => {
    if (!wallet || !wallet.tokens || !Array.isArray(wallet.tokens)) return 0;
    return wallet.tokens.filter(t => t && typeof t.amount === 'number' && t.amount > 0).length;
  };

  const loadMoreTokens = () => {
    if (hasMoreTokens && !loadingMoreTokens) {
      fetchMasterTokens(tokenPage + 1);
    }
  };

  const loadMoreWallets = () => {
    if (hasMoreWallets && !loadingMoreWallets) {
      fetchWallets(walletPage + 1);
    }
  };

  // Function to check database status - reduce frequency to avoid overwhelming the connection
const checkDatabaseStatus = async () => {
  setIsCheckingDb(true);
  try {
    console.log("Checking database status...");
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/health`, {
      timeout: 8000
    });
    
    const status = response.data.database === 'connected' ? 'connected' : 'disconnected';
    setDbStatus(status);
    
    console.log(`Database status check: ${status}`, response.data);
    
    // If database is connected and we had an error, clear it
    if (status === 'connected' && error && error.includes('Database unavailable')) {
      setError(null);
    }
    
    return status;
  } catch (error) {
    console.error('Error checking database status:', error);
    setDbStatus('disconnected');
    return 'disconnected';
  } finally {
    setIsCheckingDb(false);
  }
};

// Function to attempt database reconnection with better feedback
const reconnectDatabase = async () => {
  setIsCheckingDb(true);
  setDbStatus('checking');
  setError(null); // Clear previous errors
  setSuccessMessage('Attempting to reconnect to database...');
  
  try {
    console.log("Sending reconnection request to server...");
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/reconnect-db`, {
      timeout: 12000 // Increase timeout for reconnection
    });
    
    console.log('Database reconnection response:', response.data);
    
    // Check connection status after reconnection attempt
    const currentStatus = await checkDatabaseStatus();
    
    if (currentStatus === 'connected') {
      setDbStatus('connected');
      setSuccessMessage('Database connection restored successfully');
      
      // Refresh data
      setTimeout(() => {
        fetchWallets(0);
        if (publicKey) {
          fetchMasterTokens(0);
        }
      }, 1000);
    } else {
      setDbStatus('disconnected');
      setError('Database reconnection failed. The connection attempt was made but the database is still unavailable.');
    }
  } catch (error) {
    console.error('Error reconnecting to database:', error);
    setDbStatus('disconnected');
    setError(`Database reconnection failed: ${error.response?.data?.error || error.message}`);
  } finally {
    setIsCheckingDb(false);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  }
};

// Modify the useEffect to check less frequently
useEffect(() => {
  checkDatabaseStatus();
  
  // Check every 60 seconds (reduced frequency)
  const intervalId = setInterval(() => {
    checkDatabaseStatus();
  }, 60000);
  
  return () => clearInterval(intervalId);
}, []);

  return (
    <ChaosPaper>
      {isLoadingData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: '#92E643' }} />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#92E643', fontWeight: 'bold' }}>
              Manage Wallets
            </Typography>

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

            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#92E643' }}>
                Send/Collect SOL
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
                  }} />
                <ActionButton
                  variant="contained"
                  onClick={fundWallets}
                  disabled={loading || !publicKey || wallets.length === 0 || parseFloat(solAmount) <= 0}
                  startIcon={loading && <CircularProgress size={20} />}
                >
                  Send SOL
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

            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#92E643' }}>
                Send/Collect Tokens
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
                    {masterTokens && Array.isArray(masterTokens) ? masterTokens.map((token, index) => (
                      <MenuItem 
                        key={`${token.mint}_${index}`} 
                        value={token.mint} 
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                      >
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
                    )) : null}
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
                    } }
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
                    }} />
                  <ActionButton
                    variant="contained"
                    onClick={buyTokens}
                    disabled={loading || wallets.length === 0 || !selectedToken || parseFloat(tokenPercentage) <= 0}
                    startIcon={loading && <CircularProgress size={20} />}
                  >
                    Send Tokens
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
                {masterTokens && masterTokens.length > 0 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#92E643' }}>
                      {masterTokens.length} tokens loaded
                    </Typography>
                    {hasMoreTokens && (
                      <ActionButton
                        size="small"
                        variant="outlined"
                        onClick={loadMoreTokens}
                        disabled={loadingMoreTokens}
                        sx={{ mt: 1 }}
                      >
                        {loadingMoreTokens ? (
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                        ) : null}
                        Load More Tokens
                      </ActionButton>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>

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
                  }} />
                <Typography variant="caption" sx={{ color: '#92E643', mt: 1 }}>
                  {progressValue}% Complete
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}>
            {dbStatus === 'connected' && (
              <Tooltip title="Database is online">
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Database Online"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {dbStatus === 'disconnected' && (
              <Tooltip title="Database connection lost">
                <Chip
                  icon={<ErrorIcon />}
                  label="Database Offline"
                  color="error"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {dbStatus === 'checking' && (
              <Tooltip title="Checking database connection...">
                <Chip
                  icon={<SyncIcon sx={{ animation: 'spin 1.5s linear infinite' }} />}
                  label="Checking Connection"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {dbStatus === 'unknown' && (
              <Tooltip title="Database status unknown">
                <Chip
                  icon={<HelpOutlineIcon />}
                  label="Status Unknown"
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            <Tooltip title={dbStatus === 'connected' ? 'Connection is active' : 'Attempt to reconnect'}>
              <span>
                <IconButton
                  size="small"
                  onClick={reconnectDatabase}
                  disabled={isCheckingDb || dbStatus === 'connected'}
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon sx={isCheckingDb ? { animation: 'spin 1.5s linear infinite' } : {}} />
                </IconButton>
              </span>
            </Tooltip>
            
            {/* Add keyframes for the spinning animation */}
            <style jsx global>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
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
                        color: '#92E643',
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
                    {wallets && Array.isArray(wallets) && wallets
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((wallet) => {
                        const primaryToken = wallet?.tokens?.length > 0 
                          ? wallet.tokens.sort((a, b) => {
                              if (!a || !a.lastUpdated) return 1;
                              if (!b || !b.lastUpdated) return -1;
                              return new Date(b.lastUpdated) - new Date(a.lastUpdated);
                            })[0]
                          : null;

                        const totalTokenAmount = calculateTotalTokenAmount(wallet);
                        const activeTokenCount = getActiveTokenCount(wallet);

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
                                color: activeTokenCount > 0 ? '#92E643' : '#fff',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {activeTokenCount}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: totalTokenAmount > 0 ? '#92E643' : '#fff',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {totalTokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: primaryToken?.amount > 0 ? '#92E643' : '#fff',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              {primaryToken?.symbol || '-'}
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

                <TablePagination
                  rowsPerPageOptions={[5, 10, 20, 30]}
                  component="div"
                  count={wallets && Array.isArray(wallets) ? wallets.length : 0}
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
                  }} />
                {hasMoreWallets && (
                  <Box sx={{ textAlign: 'center', py: 2, borderTop: '1px solid rgba(146, 230, 67, 0.2)' }}>
                    <ActionButton
                      size="small"
                      variant="outlined"
                      onClick={loadMoreWallets}
                      disabled={loadingMoreWallets}
                      startIcon={loadingMoreWallets && <CircularProgress size={16} />}
                    >
                      Load More Wallets
                    </ActionButton>
                  </Box>
                )}
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

                    {selectedWallet.tokens && Array.isArray(selectedWallet.tokens) && selectedWallet.tokens.length > 0 ? (
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
                                <Tooltip title={`${token.name || 'Unknown'} (${token.mint})`}>
                                  <Typography variant="body2">
                                    {token.name || 'Unknown'}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: (token.amount || 0) > 0 ? '#92E643' : '#fff' }}
                              >
                                {typeof token.amount === 'number' 
                                  ? token.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                  : '0'}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ color: '#92E643' }}
                              >
                                {token.symbol || 'Unknown'}
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
                                      <LaunchIcon fontSize="small" />
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
        </>
      )}
    </ChaosPaper>
  );
};

export default WalletManager;