import type { FastifyInstance } from "fastify";
import { TierSchema, issueSessionToken } from "@dvod/session-spec";

import {
  SESSION_ESCROW_ADDRESS,
  ARC_TESTNET_CHAIN_ID,
  MAX_SESSION_HOURS,
  SESSION_TOKEN_SECRET,
} from "../config.js";
import { priceWei, priceDisplay } from "../pricing.js";
import { eligibleOperators } from "../relays.js";
import { verifySessionPurchase, PaymentVerificationError } from "../arc-client.js";
import { recordTransition } from "../session-state.js";
import { broadcast } from "../ws-hub.js";

/** Replay protection - a real deployment would persist this (Phase 4's Postgres). */
const usedTxHashes = new Set<string>();

/**
 * `POST /sessions/:tier/:hours` - x402-shaped, but see docs/arc-testnet-deploy.md's
 * architecture note: x402's real settlement moves an asset to `payTo`, with no
 * generic-calldata path for a specific contract call. So the 402 quote below points
 * at `SessionEscrow.purchaseSession` directly (via `extra`), the client signs and
 * sends that transaction itself, and retries with `x-session-tx: <hash>` - which
 * this route verifies against the real chain (brief §7.1's flow, adapted to what
 * x402 v2 actually supports).
 */
export function registerSessionsRoute(app: FastifyInstance) {
  app.post<{ Params: { tier: string; hours: string } }>(
    "/sessions/:tier/:hours",
    async (request, reply) => {
      const tierResult = TierSchema.safeParse(request.params.tier);
      const hours = Number(request.params.hours);

      if (!tierResult.success || !Number.isInteger(hours) || hours < 1 || hours > MAX_SESSION_HOURS) {
        return reply.code(400).send({ error: "invalid tier or hours" });
      }
      const tier = tierResult.data;

      const eligible = await eligibleOperators(tier);
      if (eligible.length === 0) {
        return reply.code(400).send({ error: `no active relay currently supports tier "${tier}"` });
      }

      const required = priceWei(tier, hours);
      const txHash = request.headers["x-session-tx"] as string | undefined;

      if (!txHash) {
        return reply.code(402).send({
          x402Version: 1,
          accepts: [
            {
              scheme: "exact",
              price: `$${priceDisplay(tier, hours)}`,
              network: `eip155:${ARC_TESTNET_CHAIN_ID}`,
              payTo: SESSION_ESCROW_ADDRESS,
              extra: {
                contract: SESSION_ESCROW_ADDRESS,
                function: "purchaseSession",
                args: [tier, hours],
                note: "Call this function directly with the exact price as msg.value, then retry with header x-session-tx: <tx hash>.",
              },
            },
          ],
        });
      }

      if (usedTxHashes.has(txHash)) {
        return reply.code(409).send({ error: "this payment has already been used for a session" });
      }

      try {
        const { sessionId, payer } = await verifySessionPurchase(
          txHash as `0x${string}`,
          tier,
          hours,
          required,
        );
        usedTxHashes.add(txHash);

        const relay = eligible[0]!;
        const expiresAt = Math.floor(Date.now() / 1000) + hours * 3600;
        const sid = sessionId.toString();

        // Drive the real state machine (brief §4/§6 Phase 4) - each transition is
        // an event row, broadcast live to WS /stream as it happens.
        for (const [toState, detail] of [
          ["PAID", `paid via tx ${txHash}`],
          ["TOKEN_ISSUED", undefined],
          ["TUNNEL_OPEN", `relay ${relay.operator}`],
          ["ACTIVE", undefined],
        ] as const) {
          const event = await recordTransition(sid, toState, { relay: relay.operator, tier, detail });
          broadcast({ type: "session_transition", ...event });
        }

        const token = issueSessionToken(
          {
            sessionId: Number(sessionId),
            relay: relay.operator,
            tier,
            hours,
            expiresAt,
          },
          SESSION_TOKEN_SECRET,
        );

        return reply.send({
          token,
          relay: relay.operator,
          tier,
          hours,
          sessionId: sessionId.toString(),
          payer,
          txHash,
          expiresAt,
        });
      } catch (err) {
        if (err instanceof PaymentVerificationError) {
          return reply.code(402).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
