import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Slider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge,
  InputAdornment
} from '@mui/material';
import { styled } from '@mui/system';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '../context/NetworkContext';
import { formatDistance } from 'date-fns';
import { pt } from 'date-fns/locale';

// Componentes estilizados
const ActionButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  textTransform: 'uppercase',
  fontFamily: "'Press Start 2P', cursive",
  fontSize: '0.7rem',
  padding: '10px 20px',
  borderRadius: '2px',
  boxShadow: '0 0 10px rgba(146, 230, 67, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 0 15px rgba(146, 230, 67, 0.5)',
  },
}));

const FormField = styled(TextField)({
  marginBottom: '20px',
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(146, 230, 67, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(146, 230, 67, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#92E643',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#92E643',
  },
});

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: '5px',
  border: '1px solid rgba(146, 230, 67, 0.2)',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #92E643, transparent)',
    animation: 'shimmer 4s infinite',
  },
}));

// New styled component for transaction table
const TransactionTable = styled(TableContainer)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: '5px',
  '& .MuiTableHead-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  '& .MuiTableCell-root': {
    borderBottom: '1px solid rgba(146, 230, 67, 0.1)',
    fontSize: '0.75rem',
  },
  '& .bot-transaction': {
    backgroundColor: 'rgba(146, 230, 67, 0.05)',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: 'rgba(146, 230, 67, 0.1)',
  },
}));

const BotManager = () => {
  const { publicKey } = useWallet();
  const { network, connection } = useNetwork();
  const [tokens, setTokens] = useState([]);
  const [activeBots, setActiveBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    tokenMint: '',
    minDelay: 60,  // 60 segundos (era 60000 ms)
    maxDelay: 300, // 300 segundos (era 300000 ms)
    minAmount: 0.01,  // 0.01 SOL
    maxAmount: 0.1,   // 0.1 SOL
    network: network,
  });
  
  // New state for transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [botWalletAddresses, setBotWalletAddresses] = useState([]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      network: network
    }));
  }, [network]);

  useEffect(() => {
    if (publicKey) {
      fetchMasterTokens();
      fetchBotStatus();
      fetchBotWallets();
    }
  }, [publicKey, network]);

  // Auto refresh transactions if enabled
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh && formData.tokenMint) {
      intervalId = setInterval(() => {
        fetchTokenTransactions(formData.tokenMint);
      }, 15000); // Refresh every 15 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, formData.tokenMint]);

  // Fetch transactions when token changes
  useEffect(() => {
    if (formData.tokenMint) {
      fetchTokenTransactions(formData.tokenMint);
    }
  }, [formData.tokenMint]);

  const fetchBotWallets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/wallets`, {
        params: { network }
      });
      
      if (response.data.wallets && response.data.wallets.length > 0) {
        // Extract wallet addresses for transaction comparison
        const addresses = response.data.wallets.map(wallet => wallet.address);
        setBotWalletAddresses(addresses);
      }
    } catch (error) {
      console.error('Failed to fetch bot wallets:', error);
    }
  };

  const fetchTokenTransactions = async (tokenMint) => {
    if (!tokenMint) return;
    
    try {
      setTransactionsLoading(true);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/token-transactions`, {
        params: { 
          tokenMint,
          network,
          limit: 20 // Adjust as needed
        }
      });
      
      if (response.data && response.data.transactions) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      // Don't show error message for transactions to avoid cluttering the UI
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchMasterTokens = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/master-tokens/${publicKey?.toString()}`, {
        params: { 
          network
        }
      });
      setTokens(response.data.tokens || []);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      setMessage({ 
        text: 'Falha ao buscar tokens. Por favor, tente novamente.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/bot-status`, {
        params: { network }
      });
      if (response.data.bots) {
        setActiveBots(response.data.bots);
      }
    } catch (error) {
      console.error('Failed to fetch bot status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const startBots = async () => {
    if (!formData.tokenMint) {
      setMessage({ text: 'Por favor, selecione um token.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      // Converter segundos para milissegundos ao enviar para o backend
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/start-bots`, {
        ...formData,
        minDelay: formData.minDelay * 1000, // Converter segundos para ms
        maxDelay: formData.maxDelay * 1000  // Converter segundos para ms
      });
      
      if (response.data.success) {
        setMessage({ 
          text: `Bots iniciados com sucesso para ${getTokenNameByMint(formData.tokenMint)}!`,
          type: 'success'
        });
        fetchBotStatus();
      } else {
        setMessage({ text: response.data.message || 'Falha ao iniciar bots.', type: 'error' });
      }
    } catch (error) {
      console.error('Error starting bots:', error);
      setMessage({ 
        text: error.response?.data?.message || 'Erro ao iniciar bots. Verifique o console para detalhes.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async (tokenMint) => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/stop-bot`, { 
        tokenMint,
        network
      });
      
      if (response.data.success) {
        setMessage({ 
          text: `Bot para ${getTokenNameByMint(tokenMint)} parado com sucesso!`,
          type: 'success'
        });
        fetchBotStatus();
      } else {
        setMessage({ text: response.data.message || 'Falha ao parar bot.', type: 'error' });
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
      setMessage({ text: 'Erro ao parar bot. Verifique o console para detalhes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const stopAllBots = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/stop-all-bots`, {
        network
      });
      
      if (response.data.success) {
        setMessage({ text: 'Todos os bots foram parados com sucesso!', type: 'success' });
        fetchBotStatus();
      } else {
        setMessage({ text: response.data.message || 'Falha ao parar todos os bots.', type: 'error' });
      }
    } catch (error) {
      console.error('Error stopping all bots:', error);
      setMessage({ text: 'Erro ao parar todos os bots. Verifique o console para detalhes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getTokenNameByMint = (mint) => {
    const token = tokens.find(t => t.mint === mint);
    return token ? `${token.symbol} (${token.name})` : mint.slice(0, 8) + '...';
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Check if a transaction is from one of our bots
  const isBotTransaction = useCallback((transaction) => {
    if (!transaction || !botWalletAddresses.length) return false;
    
    // Check if sender or receiver is one of our bot wallets
    return botWalletAddresses.includes(transaction.fromAddress) || 
           botWalletAddresses.includes(transaction.toAddress);
  }, [botWalletAddresses]);

  // Format transaction amount with token symbol
  const formatAmount = (amount, decimals = 9, symbol = '') => {
    if (amount === undefined || amount === null) return 'N/A';
    
    const formattedAmount = (amount / Math.pow(10, decimals)).toFixed(4);
    return `${formattedAmount} ${symbol}`;
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Get transaction type (buy/sell) based on token flow
  const getTransactionType = (transaction) => {
    if (!transaction) return 'Unknown';
    
    // This is a simplified logic - you might need to adjust based on your actual data
    if (transaction.transactionType) {
      return transaction.transactionType;
    }
    
    // Try to determine if it's a buy or sell
    if (isBotTransaction(transaction)) {
      if (botWalletAddresses.includes(transaction.fromAddress)) {
        return 'SELL';
      } else {
        return 'BUY';
      }
    }
    
    return 'SWAP';
  };

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h2" sx={{ mb: 4, textAlign: 'center', color: '#92E643' }}>
        Gerenciador de Bots ({network})
      </Typography>

      <Grid container spacing={4}>
        {/* Configuration section */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3}
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              border: '1px solid rgba(146, 230, 67, 0.2)',
              borderRadius: '10px'
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, borderBottom: '1px solid rgba(146, 230, 67, 0.3)', pb: 1 }}>
              Configuração de Bots
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="token-select-label">Selecione um Token</InputLabel>
              <Select
                labelId="token-select-label"
                id="token-select"
                name="tokenMint"
                value={formData.tokenMint}
                onChange={handleInputChange}
                label="Selecione um Token"
              >
                {tokens.map((token) => (
                  <MenuItem key={token.mint} value={token.mint}>
                    {token.symbol} ({token.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Intervalo entre Operações (segundos)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Mínimo"
                    type="number"
                    name="minDelay"
                    value={formData.minDelay}
                    onChange={handleInputChange}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">seg</InputAdornment>,
                    }}
                    inputProps={{ min: 10 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Máximo"
                    type="number"
                    name="maxDelay"
                    value={formData.maxDelay}
                    onChange={handleInputChange}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">seg</InputAdornment>,
                    }}
                    inputProps={{ min: formData.minDelay }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Valor das Operações (SOL)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Mínimo"
                    type="number"
                    name="minAmount"
                    value={formData.minAmount}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ step: 0.001 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Máximo"
                    type="number"
                    name="maxAmount"
                    value={formData.maxAmount}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ step: 0.001 }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button 
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={startBots}
                disabled={loading || !formData.tokenMint}
                sx={{ 
                  mr: 2,
                  backgroundColor: '#92E643',
                  color: 'black',
                  '&:hover': {
                    backgroundColor: '#7ac832',
                  }
                }}
              >
                Iniciar Bots
              </Button>
              <Button 
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={stopAllBots}
                disabled={loading || activeBots.length === 0}
              >
                Parar Todos
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Active bots section */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              border: '1px solid rgba(146, 230, 67, 0.2)',
              borderRadius: '10px',
              height: '100%'
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, borderBottom: '1px solid rgba(146, 230, 67, 0.3)', pb: 1 }}>
              Bots Ativos
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} sx={{ color: '#92E643' }} />
              </Box>
            ) : activeBots.length === 0 ? (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                Nenhum bot ativo no momento.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Token</TableCell>
                      <TableCell>Intervalo</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeBots.map((bot) => (
                      <TableRow key={bot.tokenMint}>
                        <TableCell>{getTokenNameByMint(bot.tokenMint)}</TableCell>
                        <TableCell>
                          {(bot.minDelay / 1000).toFixed(0)} - {(bot.maxDelay / 1000).toFixed(0)} seg
                        </TableCell>
                        <TableCell>
                          {bot.minAmount} - {bot.maxAmount} SOL
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => stopBot(bot.tokenMint)}
                          >
                            <StopIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* New transactions table section */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ 
            p: 3, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            border: '1px solid rgba(146, 230, 67, 0.2)',
            borderRadius: '10px'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ borderBottom: '1px solid rgba(146, 230, 67, 0.3)', pb: 1 }}>
                Transações Recentes {formData.tokenMint ? 
                  `(${tokens.find(t => t.mint === formData.tokenMint)?.symbol || 'Token'})` : ''}
              </Typography>
              <Box>
                <Tooltip title={autoRefresh ? "Pausar atualização automática" : "Ativar atualização automática"}>
                  <IconButton 
                    onClick={toggleAutoRefresh} 
                    sx={{ color: autoRefresh ? '#92E643' : 'gray' }}
                  >
                    <AutorenewIcon />
                  </IconButton>
                </Tooltip>
                <IconButton 
                  onClick={() => fetchTokenTransactions(formData.tokenMint)} 
                  disabled={transactionsLoading || !formData.tokenMint}
                  sx={{ color: '#92E643' }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
            
            {transactionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={30} sx={{ color: '#92E643' }} />
              </Box>
            ) : transactions.length > 0 ? (
              <TransactionTable>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>De</TableCell>
                      <TableCell>Para</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell align="right">Tempo</TableCell>
                      <TableCell align="center">Origem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx, index) => {
                      const isBot = isBotTransaction(tx);
                      const txType = getTransactionType(tx);
                      return (
                        <TableRow 
                          key={tx.signature || index} 
                          className={isBot ? 'bot-transaction' : ''}
                        >
                          <TableCell>
                            <Chip 
                              label={txType} 
                              size="small"
                              sx={{ 
                                backgroundColor: txType === 'BUY' ? 'rgba(0, 255, 0, 0.1)' : 
                                                txType === 'SELL' ? 'rgba(255, 0, 0, 0.1)' : 
                                                'rgba(255, 255, 255, 0.1)',
                                color: txType === 'BUY' ? '#92E643' : 
                                       txType === 'SELL' ? '#FF6B6B' : 
                                       'white',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={tx.fromAddress || 'N/A'}>
                              <span>{formatAddress(tx.fromAddress)}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={tx.toAddress || 'N/A'}>
                              <span>{formatAddress(tx.toAddress)}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            {formatAmount(tx.amount, tx.decimals, tokens.find(t => t.mint === formData.tokenMint)?.symbol)}
                          </TableCell>
                          <TableCell align="right">
                            {tx.timestamp ? 
                              formatDistance(new Date(tx.timestamp), new Date(), { addSuffix: true, locale: pt }) : 
                              'N/A'
                            }
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={isBot ? "Transação do Bot" : "Transação Externa"}>
                              <IconButton size="small" sx={{ color: isBot ? '#92E643' : '#888' }}>
                                {isBot ? <SmartToyIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TransactionTable>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {formData.tokenMint ? 
                    'Nenhuma transação encontrada para este token' : 
                    'Selecione um token para ver as transações'
                  }
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Observations section with note about devnet simulation */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ 
            p: 3, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            border: '1px solid rgba(146, 230, 67, 0.2)',
            borderRadius: '10px'
          }}>
            <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid rgba(146, 230, 67, 0.3)', pb: 1 }}>
              Observações
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Os bots compram e vendem automaticamente o token selecionado em intervalos aleatórios.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', color: '#FF6B6B' }}>
              • Na Devnet, as transações são simuladas pois não é possível criar liquidity pools no Raydium.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', color: network === 'mainnet-beta' ? '#FF6B6B' : '#92E643' }}>
              • Rede atual: {network === 'mainnet-beta' ? 'MAINNET (usa SOL real)' : network.toUpperCase()}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • As carteiras utilizadas são as mesmas que aparecem no Gerenciador de Carteiras.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Na tabela de transações, <SmartToyIcon fontSize="small" sx={{ color: '#92E643', verticalAlign: 'middle' }}/> indica transações dos bots e <PersonIcon fontSize="small" sx={{ color: '#888', verticalAlign: 'middle' }}/> indica transações de outros usuários.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic', color: '#FF6B6B' }}>
              • Na Devnet, as transações são apenas para teste e não refletem trocas reais no Raydium.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {message.text && (
        <Alert severity={message.type} sx={{ mt: 3 }} onClose={() => setMessage({ text: '', type: '' })}>
          {message.text}
        </Alert>
      )}

      {loading && (
        <Box sx={{ width: '100%', mt: 3 }}>
          <LinearProgress sx={{ 
            height: 10, 
            borderRadius: 5,
            backgroundColor: 'rgba(146, 230, 67, 0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#92E643',
              borderRadius: 5,
            }
          }} />
        </Box>
      )}
    </Box>
  );
};

export default BotManager; 