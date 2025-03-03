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
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import '@solana/wallet-adapter-react-ui/styles.css';
import './index.css';

// Tema personalizado
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#92E643' },
    background: {
      default: '#101010',
      paper: '#101010',
    },
    text: {
      primary: '#fff',
      secondary: '#ccc',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "'Press Start 2P', cursive",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          background: '#101010',
          padding: '5px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#fff',
          fontFamily: "'Press Start 2P', cursive",
          textTransform: 'uppercase',
          '&.Mui-selected': {
            color: '#fff',
            background: 'rgba(57, 255, 20, 0.1)',
            borderRadius: '8px',
          },
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: "'Press Start 2P', cursive",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Press Start 2P', cursive",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          fontFamily: "'Press Start 2P', cursive",
        },
      },
    },
  },
  typography: {
    fontFamily: "'Press Start 2P', cursive",
    h1: {
      fontFamily: "'Press Start 2P', cursive",
      color: '#92E643',
      textTransform: 'uppercase',
      fontSize: '3.5rem',
    },
    h2: {
      fontFamily: "'Press Start 2P', cursive",
      color: '#92E643',
      fontSize: '1.5rem',
    },
    body1: {
      color: '#fff',
    },
    body2: {
      color: '#ccc',
    },
  },
});

function App() {
  const [tab, setTab] = React.useState(0);
  const { connected, publicKey } = useWallet();

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const Header = () => (
    <Box sx={{ padding: 2, backgroundColor: '#101010' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
            <Typography variant="h1">SOL-HEAVEN</Typography>
          </Box>
          <Typography variant="h2" className="solsugs" sx={{ ml: 2 }}>SOLMAKER</Typography>
        </Box>
        <Box>
          <WalletMultiButton
            style={{
              background: 'linear-gradient(45deg, #92E643 30%, #7BC936 90%)',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 'bold',
              color: '#101010',
              border: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(45deg, #7BC936 30%, #92E643 90%)',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  const Footer = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, backgroundColor: '#101010', mt: 'auto' }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#92E643' }} />}>
          <Typography variant="body2" className="solsugs">What is SOL-HEAVEN?</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">
            SOL-HEAVEN is a comprehensive toolkit for Solana token creation and management. It allows you to create tokens, manage wallets, mix transactions, create liquidity pools, and access additional DeFi features on the Solana blockchain.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#101010',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />
        <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            centered
            sx={{ mb: 4, borderBottom: '2px solid #92E643'}}
          >
            <Tab label="Coin Creator" />
            <Tab label="Wallet Manager" />
            <Tab label="Mixer" />
            <Tab label="Rug Pull" />
            <Tab label="Liquidity Creator" />
            <Tab label="Extras" />
          </Tabs>

          <Card
            sx={{
              background: '#101010',
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
        <Footer />
      </Box>
    </ThemeProvider>
  );
}

export default App;