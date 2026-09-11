# Chainlink CRE - findings and what's actually real

Phase 3's honesty requirement (brief §6/§11) needs this spelled out plainly, so here
it is.

## The brief's assumption vs. reality

The brief's model was "tunnel-termination, DNS-resolution, and outbound-proxy logic
runs inside a Chainlink CRE confidential handler." Verified directly against
`docs.chain.link/cre`:

- **CRE workflows are event-driven and stateless.** Every trigger (Cron, HTTP, EVM
  Log) starts a fresh execution that runs to completion and terminates. There is no
  persistent process.
- **Workflows cannot act as network listeners.** They can make *outbound* HTTP calls,
  but cannot hold open TCP/TLS connections, accept arbitrary inbound client
  connections, or proxy ongoing traffic.
- **Confidential Workflows** (the actual TEE/attestation feature) is additionally
  private beta, requiring enrollment through a Chainlink account team, and is itself
  described as short-lived compute tasks, not persistent servers.

**Conclusion: CRE cannot run a tunnel-termination + DNS + outbound-proxy server -
categorically, not just "not in the time available."** This is why
`relay/handler_cre/tunnel-server` runs standalone as a plain process (`GET /health`
reports this), not a CRE workflow.

## What we built instead - a real, narrow, honest use of CRE

CRE's actual shape (Cron/HTTP/EVM-triggered, stateless, read-check-write) fits one
real job: periodically refreshing an operator's `dvod.attestation_build_hash` record.
`relay/handler_cre/attestation-refresher` is a real CRE TypeScript workflow, built
from Chainlink's own `keeper-bot-ts` template, that does exactly that.

### Real things, verified, not asserted

- **CRE CLI installed and authenticated** via `cre login` (real Chainlink account,
  `Deploy Access: Not enabled` - DON deployment needs further approval we don't have,
  but local simulation doesn't).
- **Local simulation genuinely runs the workflow**: compiles to real WASM (`cre
  workflow simulate`), connects to live Sepolia RPC, and executes.
- **Chain writes go through a real signed-report + receiver-contract pattern**, not
  arbitrary calldata - confirmed from the generated `IReceiver.sol`/
  `ReceiverTemplate.sol` and the `KeystoneForwarder` address quoted in the
  template's own README (`0x15fC6ae953E024d975e77382eEeC56A9101f9F88` on Sepolia).
  `contracts/ens/src/AttestationRefresherReceiver.sol` implements this real
  interface - `onReport` is only ever callable by that forwarder address, so this
  contract can only write what a genuine DON-consensus-verified CRE report says.
- **Deployed live on Sepolia**: `AttestationRefresherReceiver` at
  `0x63C02d92BEA7F074475ebfeD08773Dd05ba1E647` (tx confirmed), granted the role to
  write `carol.dvod-test.eth`'s `dvod.attestation_build_hash` on the shared resolver
  (tx `0x4fb81cf244c2da35c49dbcdc835f87ee26570322c3be74660f1b4b00afc21c8d`).
- **9 Foundry tests** on the receiver contract + watchdog, **3 Bun tests** on the CRE
  workflow itself (mocking the real generated bindings, not hand-rolled fakes).

### Fully confirmed live - the whole pipeline, on-chain

After waiting out Sepolia finality (below), `cre workflow simulate ... --broadcast`
ran the complete real pipeline: CRE read `AttestationRefresherReceiver.RESOLVER()`
live, computed a fresh hash, produced a DON-signed report, and wrote it through the
real KeystoneForwarder. Confirmed independently via `cast`:

- Tx `0x72484a47fd657926c6ad672574b5cf074e8be46412e6031f08246d1b0a75c429` - `status: 1`
- `carol.dvod-test.eth`'s `dvod.attestation_build_hash` on the live resolver now
  reads `0xaa9e8c634ead1b91604c754c0ae6494c0e0c382bcada5a06ad61a998439b6e52` - exactly
  what the workflow computed and logged.

This is the real thing, not a description of how it would work: CRE execution → DON
consensus → signed report → KeystoneForwarder → our receiver → the resolver, checked
independently after the fact rather than trusted from the CLI's own output.

### The one real limitation hit along the way, honestly

**Sepolia finality lag.** CRE's `EVMClient` reads use the chain's *last finalized*
block (a deliberate DON-consensus safety choice, not a bug) - after deploying a fresh
contract, it can take ~15-20 minutes for finality to catch up before CRE can read it.
We hit this directly: a `cre workflow simulate` run failed with `Cannot decode zero
data ("0x")` reading our freshly-deployed receiver, and confirmed via `cast code
--block finalized` that the finalized block genuinely predated our deployment. Waited
it out (polled `cast block finalized` until it passed our deploy block) and reran
successfully - see above.

### Still a STUB, honestly

The hash being written isn't from a real relay binary - `relay/handler_cre/
tunnel-server` (the standalone tunnel/DNS/proxy process) either doesn't exist yet or,
once it does, isn't yet wired to produce a real build manifest for this workflow to
hash. The workflow computes a placeholder hash from its own config. What's real is
the pipeline (CRE execution → signed report → on-chain write); what's not yet real is
the input being attested.

## Re-verifying this later

- CRE CLI/SDK/docs are all evolving; re-check `docs.chain.link/cre` before assuming
  any of the above still holds.
- The KeystoneForwarder address is Sepolia-specific and per-network; re-verify before
  targeting a different chain.
