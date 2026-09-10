"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { discoverWallets, type EIP6963ProviderDetail } from "./eip6963";

const LAST_WALLET_KEY = "dvod-last-wallet-rdns";

interface WalletContextValue {
  providers: EIP6963ProviderDetail[];
  account: `0x${string}` | null;
  connectedProvider: EIP6963ProviderDetail | null;
  connecting: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (uuid: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [connectedProvider, setConnectedProvider] = useState<EIP6963ProviderDetail | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return discoverWallets((detail) => {
      setProviders((prev) => (prev.some((p) => p.info.uuid === detail.info.uuid) ? prev : [...prev, detail]));
    });
  }, []);

  // Silent reconnect: if this browser already granted a specific wallet
  // permission before, reconnect to that exact wallet (by rdns) without a
  // popup - never falls back to a generic `window.ethereum` guess.
  useEffect(() => {
    const lastRdns = localStorage.getItem(LAST_WALLET_KEY);
    if (!lastRdns) return;
    const match = providers.find((p) => p.info.rdns === lastRdns);
    if (!match || connectedProvider) return;

    match.provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) {
          setConnectedProvider(match);
          setAccount(list[0] as `0x${string}`);
        }
      })
      .catch(() => {});
  }, [providers, connectedProvider]);

  useEffect(() => {
    const provider = connectedProvider?.provider;
    // MetaMask's real provider is a class instance whose .on relies on `this` -
    // destructuring the method off the object (`const on = provider.on`) detaches
    // it and breaks internally on call. Always invoke it as `provider.on(...)`.
    if (!provider?.on) return;

    function handleAccountsChanged(...args: unknown[]) {
      const accounts = args[0] as string[];
      if (accounts[0]) {
        setAccount(accounts[0] as `0x${string}`);
      } else {
        setAccount(null);
        setConnectedProvider(null);
        localStorage.removeItem(LAST_WALLET_KEY);
      }
    }

    provider.on("accountsChanged", handleAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [connectedProvider]);

  const connect = useCallback(
    async (uuid: string) => {
      const detail = providers.find((p) => p.info.uuid === uuid);
      if (!detail) return;
      setConnecting(true);
      try {
        const accounts = (await detail.provider.request({ method: "eth_requestAccounts" })) as string[];
        if (accounts[0]) {
          setConnectedProvider(detail);
          setAccount(accounts[0] as `0x${string}`);
          localStorage.setItem(LAST_WALLET_KEY, detail.info.rdns);
          setModalOpen(false);
        }
      } finally {
        setConnecting(false);
      }
    },
    [providers],
  );

  const disconnect = useCallback(() => {
    setAccount(null);
    setConnectedProvider(null);
    localStorage.removeItem(LAST_WALLET_KEY);
  }, []);

  const value = useMemo(
    () => ({
      providers,
      account,
      connectedProvider,
      connecting,
      isModalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      connect,
      disconnect,
    }),
    [providers, account, connectedProvider, connecting, isModalOpen, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
