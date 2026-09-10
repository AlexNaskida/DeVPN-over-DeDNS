import type { FastifyInstance } from "fastify";
import { listOperators } from "../relays.js";

/** `GET /relays` - ENSv2-registered relays + status + declared tiers. */
export function registerRelaysRoute(app: FastifyInstance) {
  app.get("/relays", async () => {
    const operators = await listOperators();
    return {
      relays: operators.map((op) => ({
        operator: op.operator,
        status: op.status,
        tiersSupported: op.tiers_supported,
        endpoint: op.endpoint,
      })),
    };
  });

  /** `GET /relays/:id/attestation` - current attestation report + operator status.
   *  Honest limitation: there is no real Chainlink CRE handler binary to verify
   *  against yet (see docs/chainlink-cre-findings.md) - this reports the on-chain
   *  attestation_build_hash and status as-is, not an independent verification. */
  app.get<{ Params: { id: string } }>("/relays/:id/attestation", async (request, reply) => {
    const operators = await listOperators();
    const op = operators.find((o) => o.operator === request.params.id);
    if (!op) return reply.code(404).send({ error: `no relay ${request.params.id}` });

    return reply.send({
      operator: op.operator,
      status: op.status,
      attestationBuildHash: op.attestation_build_hash,
      simulated: true,
      reason: "STUB attestation hash - no real CRE handler binary yet. See docs/chainlink-cre-findings.md.",
    });
  });
}
