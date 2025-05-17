import React, { createContext, useState, useContext, useEffect } from "react";
import { clusterApiUrl, Connection } from "@solana/web3.js";

// Available networks
export const NETWORKS = {
  MAINNET: "mainnet-beta",
  TESTNET: "testnet",
  DEVNET: "devnet",
};

// RPC endpoints for each network
// Using better endpoint for mainnet to avoid rate limiting
const RPC_ENDPOINTS = {
  [NETWORKS.MAINNET]:
    process.env.REACT_APP_MAINNET_RPC ||
    "https://solana-mainnet.rpc.extrnode.com",
  [NETWORKS.TESTNET]:
    process.env.REACT_APP_TESTNET_RPC || clusterApiUrl(NETWORKS.TESTNET),
  [NETWORKS.DEVNET]:
    process.env.REACT_APP_DEVNET_RPC || clusterApiUrl(NETWORKS.DEVNET),
};

// Create context
const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
  // Get saved network from localStorage or default to devnet
  const [network, setNetwork] = useState(() => {
    const savedNetwork = localStorage.getItem("solana-network");
    return savedNetwork || NETWORKS.DEVNET;
  });

  // Create connection with appropriate endpoint
  const [connection, setConnection] = useState(() => {
    const endpoint = RPC_ENDPOINTS[network];
    return new Connection(endpoint, "confirmed");
  });

  // Update connection when network changes
  useEffect(() => {
    try {
      const endpoint = RPC_ENDPOINTS[network];
      console.log(`Connecting to ${network} using endpoint: ${endpoint}`);

      const newConnection = new Connection(endpoint, {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 60000, // 60 seconds timeout
        disableRetryOnRateLimit: false, // Allow retries
      });

      setConnection(newConnection);
      localStorage.setItem("solana-network", network);
    } catch (error) {
      console.error(`Error creating connection to ${network}:`, error);
    }
  }, [network]);

  // Change network function
  const changeNetwork = (newNetwork) => {
    if (Object.values(NETWORKS).includes(newNetwork)) {
      setNetwork(newNetwork);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        network,
        connection,
        changeNetwork,
        NETWORKS,
        RPC_ENDPOINTS,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// Custom hook for using the network context
export const useNetwork = () => useContext(NetworkContext);
