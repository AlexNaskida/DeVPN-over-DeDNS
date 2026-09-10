# Security & threat model

This is the honest, consolidated version of the "what's real vs. simulated" notes
scattered through the README's per-phase sections. If something here disagrees with
the README, the README (updated more often, closer to the code) wins - open an issue.

## What DVoD actually protects against, today

**Real, verified:**

- **Payment can't be faked.** `apps/orchestrator` only issues a session token after
  independently reading the `purchaseSession` transaction receipt back from the chain
  itself (`arc-client.ts`) - it never trusts a client-supplied claim of payment.
- **Revocation is permissionless and can't be blocked by the operator.**
  `WatchdogRevoker.sol` lets *anyone* submit an attestation mismatch; the contract
  itself flips the operator's status on-chain. No admin key, no operator cooperation,
  needed to revoke a misbehaving relay. Verified live on Sepolia (README, Phase 1).
- **The payout address is never delegated to the operational key.** A compromised
  operational key (the one that updates endpoint/tiers/attestation) cannot redirect
  revenue - see `packages/identity/ens/src/roles.ts`'s role split.
- **Session tokens are time-boxed and tamper-evident.** HMAC-SHA256 signed
  (`packages/session-spec/src/session-token.ts`), checked against `expiresAt` on
  verify, `timingSafeEqual` comparison (not `===`, which would leak timing
  information about the signature).
- **The state machine rejects invalid transitions, not just documents them.** Every
  `recordTransition` call is checked against `SESSION_STATE_TRANSITIONS` before being
  written - `InvalidTransitionError` if not, verified by a real Postgres-backed test
  (`apps/orchestrator/src/session-state.test.ts`).

## What DVoD does NOT protect against, today (the honest gaps)

This is the section most likely to matter to anyone deciding whether to trust this
for anything beyond a demo.

- **No user traffic is actually tunneled anywhere yet.** `relay/handler_cre/tunnel-server`
  is real, working HTTP CONNECT proxy code - but it isn't deployed anywhere reachable
  (every registered operator endpoint in ENSv2 is a placeholder `.example` domain), and
  there's no client that would point a user's device at it even if it were. Purchasing
  a session today gets you a real payment, a real signed token, and a real live
  dashboard - not a VPN tunnel. See the session dashboard's "What's visible to whom"
  panel for the same disclosure in-product.
- **No confidential compute.** Even once a tunnel-server is deployed, the relay
  operator's own process can read your DNS queries and proxied traffic in the clear.
  The brief's "operator can't see your traffic" claim requires Chainlink CRE
  confidential workflows, which - verified directly against Chainlink's own docs
  (`docs/chainlink-cre-findings.md`) - categorically cannot run a persistent
  proxy/DNS server. This is a real platform-shape mismatch, not a time constraint.
- **Attestation content is a stub.** `WatchdogRevoker` correctly revokes on a
  attestation-hash mismatch, but the hash every operator publishes today is
  `keccak256("STUB: no real CRE handler binary yet for <name>")` - there's no real
  relay build artifact to hash yet, so the revocation mechanism has nothing genuine
  to check against. The mechanism is real; the input isn't.
- **No partial refunds.** Ending a session early (the "End session" button) or a
  relay going permanently unreachable doesn't return unused funds - `SessionEscrow.sol`
  has no partial-refund path, only a full `refundSession` for admin use. Users are told
  this plainly before confirming.
- **`SESSION_TOKEN_SECRET` needs to be set for real deployments.** It defaults to
  `"dev-only-insecure-secret"` if unset (`apps/orchestrator/src/config.ts`) - anyone
  deploying this for real must set a random value, or every session token is
  forgeable. (Our own Render deployment sets a real one.)
- **No rate limiting or abuse protection** on any orchestrator route. A hackathon-scope
  build, not hardened against spam/DoS.
- **No replay-protection persistence.** `usedTxHashes` (routes/sessions.ts) is an
  in-memory `Set` - restarting the orchestrator process resets it, meaning a
  previously-used tx hash could theoretically be replayed once (though it would need
  to match tier/hours/price exactly and the chain state would already show it consumed
  by session accounting). Fine for a demo; a real deployment needs this in the
  database, not process memory.

## Trust assumptions

- **The orchestrator is trusted for availability, not correctness.** It can't forge a
  payment or fake a revocation (both are checked against the chain), but it *can*
  simply go down (single Render instance, no redundancy) or misreport which relay is
  "eligible" - there's no independent client-side verification of `GET /tiers` /
  `GET /relays` against the chain.
- **Relay operators are trusted for confidentiality, not for authorization.** ENSv2 +
  the watchdog contract control *who's allowed to operate* on-chain and
  permissionlessly; they say nothing about what an authorized operator's process
  actually does with your traffic once it's their process reading it (see the
  confidential-compute gap above).
- **Neon/Render/Cloudflare are trusted the way any hosted infrastructure is.** No
  different from trusting any cloud provider - not a DVoD-specific claim, just stating
  it plainly since the whole rest of this document is about being explicit on trust.

## Reporting

This is a hackathon project, not a maintained security-critical service. If you find
something here that's wrong or missing, open an issue - there's no bug bounty or
disclosure SLA.
