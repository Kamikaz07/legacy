import React, { useEffect, useState } from "react";
// Removing unused import: import DOMPurify from 'dompurify';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  Card,
  // Removing unused import: IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  // Removing unused import: Button,
  // Removing unused import: Alert,
  CssBaseline,
} from "@mui/material";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import CoinCreator from "./components/CoinCreator";
import WalletManager from "./components/WalletManager";
import UserBalance from "./components/UserBalance";
import NetworkSelector from "./components/NetworkSelector";
import Mixer from "./components/Mixer";
import TradingDashboard from "./components/TradingDashboard";
import BotManager from "./components/BotManager";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";
import { NetworkProvider } from "./context/NetworkContext";

// Tema personalizado
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#92E643" },
    background: {
      default: "transparent", // Changed to transparent to let the grid pattern show
      paper: "rgba(16, 16, 16, 0.8)", // Semi-transparent instead of solid
    },
    text: {
      primary: "#fff",
      secondary: "#92E643",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          margin: 0;
          padding: 0;
          background-color: #0a0a0a;
          background-image: radial-gradient(rgba(146, 230, 67, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          background-attachment: fixed;
        }

        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 50% 50%, rgba(146, 230, 67, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: #92E643 rgba(0, 0, 0, 0.3);
        }

        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #92E643 30%, #39ff14 90%);
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.3);
        }

        *::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #39ff14 30%, #92E643 90%);
        }

        ::selection {
          background: rgba(146, 230, 67, 0.3);
          color: #ffffff;
        }
      `,
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          background: "rgba(0, 0, 0, 0.8)", // Fundo escuro para contraste
          borderBottom: "4px solid #92E643", // Borda grossa inferior
          padding: "0",
        },
        indicator: {
          height: "6px", // Indicador mais grosso
          background: "#92E643",
          borderTop: "2px solid #000", // Sombra para efeito 3D
          borderBottom: "2px solid #000",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: "#fff",
          fontFamily: "'Press Start 2P', cursive", // Fonte pixelada
          fontSize: "0.8rem",
          textTransform: "uppercase",
          minHeight: "60px", // Altura maior para os tabs
          padding: "10px 20px",
          border: "2px solid #92E643", // Borda grossa
          borderBottom: "none",
          background: "rgba(0, 0, 0, 0.5)", // Fundo semi-transparente
          "&:hover": {
            background: "rgba(146, 230, 67, 0.2)", // Efeito de hover
          },
          "&.Mui-selected": {
            color: "#000",
            background: "#92E643", // Fundo verde quando selecionado
            borderBottom: "2px solid #000", // Sombra para efeito 3D
          },
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
          borderRadius: "2px",
          textTransform: "uppercase",
          padding: "10px 16px",
          position: "relative",
          border: "1px solid transparent",
          overflow: "hidden",
          transition: "all 0.3s ease",
          backgroundColor: "rgba(10, 10, 10, 0.8)",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-2px",
            left: "-2px",
            height: "5px",
            width: "5px",
            background: "#92E643",
            transition: "all 0.3s ease",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            height: "5px",
            width: "5px",
            background: "#92E643",
            transition: "all 0.3s ease",
          },
          "&:hover": {
            border: "1px solid #92E643",
            boxShadow: "0 0 15px rgba(146, 230, 67, 0.5)",
            "&::before": {
              transform: "translate(5px, 5px)",
            },
            "&::after": {
              transform: "translate(-5px, -5px)",
            },
          },
        },
        containedPrimary: {
          background: "#92E643", // Remove gradient, use solid color
          color: "#000",
          fontWeight: "bold",
          border: "none",
          boxShadow: "0 0 10px rgba(146, 230, 67, 0.5)",
          "&:hover": {
            background: "#92E643", // Keep same color on hover
            boxShadow: "0 0 15px rgba(146, 230, 67, 0.8)",
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          fontFamily: "'Press Start 2P', cursive",
          backgroundColor: "rgba(10, 10, 10, 0.9)",
          border: "1px solid rgba(146, 230, 67, 0.2)",
          "&::before": {
            display: "none",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          backgroundColor: "rgba(10, 10, 10, 0.9)",
          backgroundImage:
            "linear-gradient(rgba(146, 230, 67, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(146, 230, 67, 0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          border: "1px solid rgba(146, 230, 67, 0.2)",
          position: "relative",
          overflow: "hidden",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(10, 10, 10, 0.9)",
          backgroundImage:
            "radial-gradient(rgba(146, 230, 67, 0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(146, 230, 67, 0.1)",
        },
        head: {
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "0.6rem",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          color: "#92E643",
        },
      },
    },
  },
  typography: {
    fontFamily: "'Press Start 2P', cursive",
    h1: {
      fontFamily: "'Press Start 2P', cursive",
      color: "#92E643",
      textTransform: "uppercase",
      fontSize: "3rem",
      letterSpacing: "1px",
    },
    h2: {
      fontFamily: "'Press Start 2P', cursive",
      color: "#92E643",
      fontSize: "1.3rem",
      letterSpacing: "0.8px",
    },
    body1: {
      fontFamily: "'Press Start 2P', cursive",
      color: "#fff",
      fontSize: "0.8rem",
      lineHeight: 1.8,
    },
    body2: {
      fontFamily: "'Press Start 2P', cursive",
      color: "#ccc",
      fontSize: "0.7rem",
      lineHeight: 1.6,
    },
  },
});

function App() {
  const [tab, setTab] = React.useState(0);
  // Only using publicKey from wallet
  const { publicKey } = useWallet();

  // Animation state is defined but not used in the current implementation
  const [, setAnimationLoaded] = useState(false);

  useEffect(() => {
    // Trigger animations after a short delay
    setTimeout(() => {
      setAnimationLoaded(true);
    }, 100);
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  // Replace the current Header with this enhanced version

  const Header = () => (
    <Box
      sx={{
        padding: "15px 20px",
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        position: "relative",
        borderBottom: "1px solid rgba(146, 230, 67, 0.3)",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Box>
            <Typography
              variant="h1"
              className="glitch-text"
              data-text="SOL-HEAVEN"
              sx={{
                color: "#92E643",
                position: "relative",
                transition: "all 0.3s ease",
                textShadow:
                  "2px 2px 0px rgba(0,0,0,0.2), 0 0 10px rgba(146, 230, 67, 0.5)",
                "&:hover": {
                  letterSpacing: "2px",
                  textShadow:
                    "2px 2px 0px rgba(0,0,0,0.5), 0 0 15px rgba(146, 230, 67, 0.8)",
                },
              }}
            >
              SOL-HEAVEN
            </Typography>
          </Box>

          <Typography
            variant="h2"
            className="solsugs"
            sx={{
              ml: 2,
              color: "#92E643",
              opacity: 0,
              transition: "all 0.3s ease",
              animation: "fadeIn 0.8s ease forwards 0.5s",
              textShadow: "0 0 5px rgba(146, 230, 67, 0.5)",
              background: "linear-gradient(to right, #92E643, #39ff14)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              "&:hover": {
                letterSpacing: "2px",
                transform: "scale(1.05)",
                filter: "brightness(1.2)",
              },
            }}
          >
            SOLMAKER
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <NetworkSelector />
            <WalletMultiButton
              className="wallet-button"
              style={{
                background:
                  "linear-gradient(45deg, rgba(146, 230, 67, 0.05) 30%, rgba(57, 255, 20, 0.05) 90%)",
                backdropFilter: "blur(10px)",
                borderRadius: "4px",
                padding: "12px 20px",
                fontWeight: "bold",
                fontSize: "1rem",
                letterSpacing: "1px",
                color: "#92E643",
                border: "1.5px solid #92E643",
                transition: "all 0.3s ease",
                width: "170px",
                boxShadow: "0 0 10px rgba(146, 230, 67, 0.2)",
                position: "relative",
              }}
            />
          </Box>
          <UserBalance />
        </Box>
      </Box>

      {/* Digital noise effect */}
      <Box
        className="matrix-bg"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />

      {/* Bottom line with glow */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "#92E643",
          boxShadow: "0 0 10px 1px #92E643",
          opacity: 0.7,
        }}
      />
    </Box>
  );

  const Footer = () => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px 20px",
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(146, 230, 67, 0.3)",
        mt: "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Accordion
        defaultExpanded
        sx={{
          background: "transparent",
          boxShadow: "none",
          "&::before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "#92E643" }} />}
          sx={{
            borderRadius: "4px",
            backgroundColor: "rgba(0,0,0,0.3)",
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(146, 230, 67, 0.1)",
            },
            "&.Mui-expanded": {
              backgroundColor: "rgba(0,0,0,0.5)",
              borderBottom: "1px solid rgba(146, 230, 67, 0.3)",
            },
          }}
        >
          <Typography
            variant="body2"
            className="blinking-cursor"
            sx={{
              color: "#92E643",
              fontFamily: "'Press Start 2P', cursive",
              fontSize: "0.7rem",
              letterSpacing: "1px",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
              "&:hover": {
                letterSpacing: "2px",
                textShadow: "0 0 10px rgba(146, 230, 67, 0.5)",
              },
            }}
          >
            What is SOL-HEAVEN?
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">
            SOL-HEAVEN is a comprehensive toolkit for Solana token creation and
            management. It allows you to create tokens, manage wallets, mix
            transactions, create liquidity pools, and access additional DeFi
            features on the Solana blockchain.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // This component is defined but not used in the current implementation
  // Commenting it out to avoid ESLint warnings
  /*
  const AnimatedAlert = ({ children, severity, sx }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    return (
      <Box sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        ...sx
      }}>
        <Alert
          severity={severity}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: severity === 'success'
                ? 'linear-gradient(45deg, transparent, rgba(146, 230, 67, 0.1), transparent)'
                : 'linear-gradient(45deg, transparent, rgba(255, 0, 0, 0.05), transparent)',
              animation: 'gradientShift 3s infinite',
              backgroundSize: '200% 200%',
            }
          }}
        >
          {children}
        </Alert>
      </Box>
    );
  };
  */

  // Create scan line effect
  React.useEffect(() => {
    const scanLine = document.createElement("div");
    scanLine.className = "scan-line";
    document.body.appendChild(scanLine);

    return () => {
      document.body.removeChild(scanLine);
    };
  }, []);

  return (
    <NetworkProvider>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "transparent !important", // Force transparency
            position: "relative",
          }}
        >
          <Header />
          <Container maxWidth="lg" sx={{ flexGrow: 1, mb: 5 }}>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mb: 5,
                mt: 2,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: "4px",
                padding: "6px",
                boxShadow:
                  "inset 0 0 15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(146, 230, 67, 0.2)",
                "& .MuiTabs-indicator": {
                  backgroundColor: "#92E643",
                  height: "3px",
                  borderRadius: "1.5px",
                  boxShadow: "0 0 10px #92E643",
                  transition: "all 0.4s ease",
                },
                "& .MuiTab-root": {
                  margin: "0 4px",
                  minWidth: "100px",
                  transition: "all 0.3s ease",
                  opacity: 0.7,
                  fontSize: "0.7rem",
                  padding: "8px 16px",
                  borderRadius: "3px",
                  border: "1px solid transparent",
                  "&:hover": {
                    backgroundColor: "rgba(146, 230, 67, 0.1)",
                    transform: "translateY(-2px)",
                    opacity: 0.9,
                    border: "1px solid rgba(146, 230, 67, 0.3)",
                  },
                  "&.Mui-selected": {
                    opacity: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(146, 230, 67, 0.5)",
                    boxShadow: "0 0 15px rgba(146, 230, 67, 0.2)",
                    animation: "pulse 0.5s ease-out",
                    color: "#92E643",
                    fontWeight: "bold",
                    "&::before": {
                      content: '">"',
                      marginRight: "5px",
                      color: "#92E643",
                    },
                  },
                },
              }}
            >
              <Tab label="Coin Creator" />
              <Tab label="Wallet Manager" />
              <Tab label="Bot Manager" />
              <Tab label="Mixer" />
              <Tab label="Charts" />
            </Tabs>

            <Card
              className="cyberpunk-card cyberpunk-grid-bg"
              sx={{
                borderRadius: "10px",
                p: 3,
                width: "100%",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{ position: "relative" }}
                className="tab-content"
                key={tab}
              >
                {tab === 0 && <CoinCreator publicKey={publicKey} />}
                {tab === 1 && <WalletManager />}
                {tab === 2 && <BotManager />}
                {tab === 3 && <Mixer />}
                {tab === 4 && <TradingDashboard />}
              </Box>
            </Card>
          </Container>
          <Footer />
        </Box>
      </ThemeProvider>
    </NetworkProvider>
  );
}

export default App;
