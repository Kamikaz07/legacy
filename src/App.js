import React from 'react';
import DOMPurify from 'dompurify';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import CoinCreator from './components/CoinCreator';
import WalletManager from './components/WalletManager';
import UserBalance from './components/UserBalance';
import Mixer from './components/Mixer';
import RugPull from './components/RugPull';
import DashboardExtras from './components/DashboardExtras';
import LiquidityCreator from './components/LiquidityCreator';
import WalletIcon from '@mui/icons-material/Wallet';

// Tema escuro personalizado com gradientes e estilização moderna
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ff4444' },
    secondary: { main: '#00e676' },
    background: {
      default: '#0d0d0d',
      paper: '#1a1a1a',
    },
  },
  components: {
    MuiTabs: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #1a1a1a 30%, #2a2a2a 90%)',
          borderRadius: '10px',
          padding: '5px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#fff',
          fontWeight: 'bold',
          '&.Mui-selected': {
            color: '#ff4444',
            background: 'rgba(255, 68, 68, 0.1)',
            borderRadius: '8px',
          },
          transition: 'all 0.3s ease',
        },
      },
    },
  },
});

function App() {
  const [tab, setTab] = React.useState(0);
  const { connected, publicKey } = useWallet();

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  // Componente de conexão da carteira
  const WalletConnection = () => (
    <Card
      sx={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        borderRadius: '15px',
        mb: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 68, 68, 0.2)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={2}>
              <WalletIcon sx={{ fontSize: 40, color: '#ff4444' }} />
              <Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {connected ? 'Wallet Connected' : 'Connect Your Wallet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                {connected && publicKey
                  ? DOMPurify.sanitize(`${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-6)}`)
                  : 'Connect to access all features'}
              </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
            <WalletMultiButton
              style={{
                background: 'linear-gradient(45deg, #ff4444 30%, #ff6666 90%)',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: 'bold',
                color: '#fff',
                border: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(45deg, #ff6666 30%, #ff8888 90%)',
                },
              }}
            />
          </Grid>
        </Grid>
        {connected && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 68, 68, 0.2)' }} />
            <UserBalance />
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #0d0d0d 0%, #1a1a1a 100%)',
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="lg">
          {/* Seção de Cabeçalho */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                background: 'linear-gradient(45deg, #ff4444, #ff6666)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                mb: 1,
              }}
            >
              Solana Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Create, manage, and explore your Solana assets
            </Typography>
          </Box>

          {/* Conexão da Carteira */}
          <WalletConnection />

          {/* Navegação por Abas */}
          <Tabs
            value={tab}
            onChange={handleTabChange}
            centered
            sx={{
              mb: 4,
            }}
          >
            <Tab label="Coin Creator" />
            <Tab label="Wallet Manager" />
            <Tab label="Mixer" />
            <Tab label="Rug Pull" />
            <Tab label="Liquidity Creator" />
            <Tab label="Extras" />
          </Tabs>

          {/* Conteúdo das Abas */}
          <Card
            sx={{
              background: '#1a1a1a',
              borderRadius: '15px',
              p: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              width: '100%',
            }}
          >
            <Box>
              {tab === 0 && <CoinCreator publicKey={publicKey} />}
              {tab === 1 && <WalletManager />}
              {tab === 2 && <Mixer />}
              {tab === 3 && <RugPull />}
              {tab === 4 && <LiquidityCreator publicKey={publicKey} />}
              {tab === 5 && <DashboardExtras />}
            </Box>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;