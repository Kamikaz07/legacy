import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const wallets = [new PhantomWalletAdapter()];

root.render(
  <React.StrictMode>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </React.StrictMode>
);