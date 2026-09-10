/**
 * EIP-6963 (Multi Injected Provider Discovery). Without this, every installed
 * wallet extension fights over the single `window.ethereum` global, and whichever
 * one injected last silently wins - which is exactly why "Connect wallet" could
 * open Phantom even for someone who meant MetaMask. EIP-6963 has each wallet
 * announce itself on a DOM event instead, so we can list every installed wallet
 * and let the user pick.
 */
export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string; // data: URI, provided by the wallet itself
  rdns: string; // reverse-DNS id, e.g. "io.metamask" - stable across sessions
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

/** Asks every installed wallet to announce itself, and calls `onProvider` for
 * each one found (including ones that announce after this is called - a wallet
 * extension can finish initializing after page load). Returns a cleanup function. */
export function discoverWallets(onProvider: (detail: EIP6963ProviderDetail) => void): () => void {
  function handleAnnouncement(event: Event) {
    onProvider((event as EIP6963AnnounceProviderEvent).detail);
  }
  window.addEventListener("eip6963:announceProvider", handleAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
}
