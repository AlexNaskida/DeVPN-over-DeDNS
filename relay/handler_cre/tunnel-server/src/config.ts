/**
 * STUB / SIMULATED - see docs/chainlink-cre-findings.md. This process is a plain
 * Node.js server, not a Chainlink CRE confidential handler: CRE cannot run a
 * persistent tunnel-termination/DNS/proxy server at all (its workflow model is
 * event-driven and stateless - see the findings doc for the verified detail). This
 * is exactly the "stub it loudly" case the brief's §6/§11 requires: the tunnel here
 * is real and actually proxies traffic, but the operator's own machine - this
 * process - can in fact see it, since there's no confidential enclave. Any UI
 * pointed at this must show a visible "SIMULATED - not yet running in CRE" badge.
 */
export const RELAY_NAME = process.env.RELAY_NAME ?? "carol.dvod-test.eth";
export const SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET ?? "dev-only-insecure-secret";
export const TUNNEL_PORT = Number(process.env.TUNNEL_PORT ?? 8443);

export const SIMULATED_BADGE = {
  simulated: true,
  reason:
    "Chainlink CRE cannot run a persistent tunnel/DNS/proxy server (event-driven, stateless workflow model) - see docs/chainlink-cre-findings.md. This relay operator's own process CAN read this traffic; that is the honest state, not a hidden assumption.",
} as const;
