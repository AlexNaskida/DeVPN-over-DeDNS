# Load test

A real load test against `GET /tiers`, run locally with `autocannon` (20 concurrent
connections, 15s), found and fixed a genuine bug - not a synthetic exercise.

## What we found

`GET /tiers` and `GET /relays` both call `listOperators()`, which read every known
operator's ENSv2 capability record from Sepolia on **every single request**, with no
caching. At just 20 concurrent connections against the public
`ethereum-sepolia-rpc.publicnode.com` endpoint:

```
69 requests in 15.05s
29 2xx responses, 20 non 2xx responses   (500s: RPC rate limit exceeded)
Latency: p50 4853ms, p99 7441ms, avg 4760ms
```

The RPC provider's own rate limit was being exhausted, producing real `500`s
(`ContractFunctionExecutionError: Rate limit exceeded`) and multi-second latency even
at trivial concurrency - a real deployment under any genuine traffic would have been
broken, not just slow.

## The fix

`apps/orchestrator/src/relays.ts` now caches `listOperators()`'s result for 10
seconds. Relay status changes on the order of minutes (a human updating a record, or
the watchdog contract revoking one) - a 10s staleness window is a real, deliberate
tradeoff, not a correctness compromise, and the whole point of this doc is being
explicit about which tradeoffs were made and why.

## After the fix

Same test, same machine, right after:

```
220,000 requests in 15.04s
Latency: p50 0ms, p97.5 3ms, p99 5ms, avg 0.87ms
Req/Sec: p50 13,239, avg 14,636
```

No errors. ~3,200x more throughput, from one 10-line change plus a real
before/after measurement - not assumed, run twice and compared.

## What this test does NOT cover

- **Write-path load** (`POST /sessions/:tier/:hours`, the purchase flow) wasn't load
  tested - it requires a real on-chain transaction per call, so a meaningful load
  test would mean broadcasting many real testnet transactions, which costs real
  (if cheap) testnet funds and isn't something to do casually. The write path's
  actual bottleneck would be Postgres write throughput and the chain's own block
  time, not application code - a different kind of test than this one.
- **The WebSocket hub** (`ws-hub.ts`) wasn't load tested for connection count. It's a
  simple in-memory `Set` of sockets with an O(n) broadcast loop - fine for a demo's
  handful of connections, not verified past that.
- This was run against local Postgres, not the production Neon instance - Neon's
  connection limits and network latency to a remote database aren't reflected here.
