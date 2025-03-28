import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography, Badge, Tooltip, Divider } from '@mui/material';
import { useNetwork, NETWORKS } from '../context/NetworkContext';
import LanguageIcon from '@mui/icons-material/Language';
import CircleIcon from '@mui/icons-material/Circle';
import InfoIcon from '@mui/icons-material/Info';

const NetworkSelector = () => {
  const { network, changeNetwork, RPC_ENDPOINTS } = useNetwork();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNetworkChange = (selectedNetwork) => {
    changeNetwork(selectedNetwork);
    handleClose();
  };

  // Network display names
  const networkLabels = {
    [NETWORKS.MAINNET]: 'Mainnet',
    [NETWORKS.TESTNET]: 'Testnet',
    [NETWORKS.DEVNET]: 'Devnet',
  };

  // Network colors
  const networkColors = {
    [NETWORKS.MAINNET]: '#92E643', // Green for mainnet
    [NETWORKS.TESTNET]: '#F5A623', // Orange for testnet
    [NETWORKS.DEVNET]: '#4C78E0',  // Blue for devnet
  };

  // Network descriptions
  const networkDescriptions = {
    [NETWORKS.MAINNET]: 'Production Solana network with real SOL',
    [NETWORKS.TESTNET]: 'Test network for application testing',
    [NETWORKS.DEVNET]: 'Development network with free airdropped SOL',
  };
  
  // Get the current RPC endpoint
  const currentEndpoint = RPC_ENDPOINTS ? RPC_ENDPOINTS[network] : '';
  
  // Format the endpoint for display (show only the domain)
  const formatEndpoint = (endpoint) => {
    if (!endpoint) return '';
    try {
      const url = new URL(endpoint);
      return url.hostname;
    } catch (e) {
      return endpoint;
    }
  };

  return (
    <Box>
      <Tooltip title={networkDescriptions[network]} arrow>
        <Button
          id="network-button"
          aria-controls={open ? 'network-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          startIcon={
            <Badge
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: networkColors[network],
                  boxShadow: `0 0 10px ${networkColors[network]}`,
                }
              }}
              variant="dot"
            >
              <LanguageIcon />
            </Badge>
          }
          sx={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${networkColors[network]}`,
            color: networkColors[network],
            padding: '6px 12px',
            borderRadius: '4px',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '0.6rem',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#fff',
            },
          }}
        >
          {networkLabels[network]}
        </Button>
      </Tooltip>
      <Menu
        id="network-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'network-button',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(146, 230, 67, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
            width: '280px',
          }
        }}
      >
        {Object.values(NETWORKS).map((net) => (
          <MenuItem 
            key={net} 
            onClick={() => handleNetworkChange(net)}
            selected={network === net}
            sx={{ 
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '0.7rem',
              color: networkColors[net],
              '&.Mui-selected': {
                backgroundColor: 'rgba(146, 230, 67, 0.1)',
              },
              '&:hover': {
                backgroundColor: 'rgba(146, 230, 67, 0.2)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircleIcon sx={{ color: networkColors[net], fontSize: '10px' }} />
              {networkLabels[net]}
            </Box>
          </MenuItem>
        ))}
        
        {RPC_ENDPOINTS && (
          <Box component="div" sx={{ width: '100%' }}>
            <Divider sx={{ my: 1, borderColor: 'rgba(146, 230, 67, 0.2)' }} />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: '0.5rem',
                }}
              >
                <InfoIcon sx={{ fontSize: '0.8rem', mr: 0.5, color: networkColors[network] }} />
                Current RPC: {formatEndpoint(currentEndpoint)}
              </Typography>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  mt: 0.5, 
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: '0.5rem',
                }}
              >
                If balance doesn't load on mainnet, try again or check your connection
              </Typography>
            </Box>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default NetworkSelector; 