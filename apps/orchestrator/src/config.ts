/**
 * Real, deployed addresses from Phase 1 (docs/ensv2-sepolia-deploy.md) and Phase 2
 * (docs/arc-testnet-deploy.md). Hardcoded for now - a real deployment would read
 * these from env vars; this is a hackathon build, not a multi-network product yet.
 */
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.io";
export const ARC_TESTNET_CHAIN_ID = 5042002;

export const SESSION_ESCROW_ADDRESS =
  "0x44Fe9A419Bb5e6d52A696f555D2E9dBb6ae23A47" as const;

export const ENS_SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
export const ENS_RESOLVER_ADDRESS = "0x0F98C60F734B363Cab6e2B64c74fedC7D9075baF" as const;

/**
 * Known registered operators. ENSv2 has no cheap on-chain "enumerate all subnames
 * under dvod-test.eth" query - a real deployment would index registration events
 * into a database (this Phase 4 Postgres already tracks session events; a fuller
 * build would index registrations the same way). For now, this list is the three
 * operators actually registered on Sepolia: bob (Phase 1, deliberately revoked in
 * that phase's live demo), carol (Phase 1, active), and dave (Phase 4, active -
 * added specifically so the forced-failover demo has a real second live target to
 * fail over to, since bob is revoked).
 */
export const KNOWN_OPERATORS = [
  {
    name: "bob.dvod-test.eth",
    operationalKeyAddress: "0xf0C16Af7eB8c169271968E70741A87885F73Bfd2" as const,
  },
  {
    name: "carol.dvod-test.eth",
    operationalKeyAddress: "0x52E6121e74Db83BAeE0685d19E4a6e491804C6ff" as const,
  },
  {
    name: "dave.dvod-test.eth",
    operationalKeyAddress: "0xe17985962085404b481367f0a234D67E6F692eBB" as const,
  },
] as const;

export const SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET ?? "dev-only-insecure-secret";
export const MAX_SESSION_HOURS = 24;

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost/dvod_dev";
