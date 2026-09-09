/**
 * Registers one DVoD relay operator on Sepolia: subname + capability record +
 * role grants, via buildRegisterOperatorCalls. Sends each call in sequence with
 * the admin wallet (the same wallet that deployed the subregistry/resolver/
 * watchdog in contracts/ens/script/DeploySepoliaInfra.s.sol).
 *
 * STUB: attestation_build_hash below is a placeholder — Phase 3 (the real
 * Chainlink CRE handler) doesn't exist yet, so there's no real audited build to
 * hash. Do not treat a "valid" attestation check against this as meaning
 * anything beyond "the demo's watchdog logic works" — see brief §11.
 *
 * Required env vars:
 *   RPC_URL, ADMIN_PRIVATE_KEY, REGISTRY_ADDRESS, RESOLVER_ADDRESS, WATCHDOG_ADDRESS
 *   OPERATOR_NAME (e.g. "bob.dvod-test.eth")
 *   OPERATIONAL_KEY_ADDRESS, PAYOUT_ADDRESS
 *   TIERS_SUPPORTED (comma-separated, e.g. "lite,standard")
 *   ENDPOINT (e.g. "https://relay-bob.example/tunnel")
 */
import {
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { buildRegisterOperatorCalls, encodeCall } from "../src/capability-record.js";
import type { Tier } from "@dvod/session-spec";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var ${name}`);
  return value;
}

async function main() {
  const rpcUrl = requireEnv("RPC_URL");
  const adminPrivateKey = requireEnv("ADMIN_PRIVATE_KEY") as Hex;
  const registryAddress = requireEnv("REGISTRY_ADDRESS") as `0x${string}`;
  const resolverAddress = requireEnv("RESOLVER_ADDRESS") as `0x${string}`;
  const watchdogAddress = requireEnv("WATCHDOG_ADDRESS") as `0x${string}`;
  const operatorName = requireEnv("OPERATOR_NAME");
  const operationalKeyAddress = requireEnv("OPERATIONAL_KEY_ADDRESS") as `0x${string}`;
  const payoutAddress = requireEnv("PAYOUT_ADDRESS") as `0x${string}`;
  const tiersSupported = requireEnv("TIERS_SUPPORTED").split(",") as Tier[];
  const endpoint = requireEnv("ENDPOINT");

  const attestationBuildHash = keccak256(
    toBytes(`STUB: no real CRE handler binary yet for ${operatorName}`),
  );

  const account = privateKeyToAccount(adminPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const calls = buildRegisterOperatorCalls(registryAddress, resolverAddress, {
    name: operatorName,
    ownerAddress: operationalKeyAddress,
    operationalKeyAddress,
    payoutAddress,
    endpoint,
    tiersSupported,
    attestationBuildHash,
    watchdogAddress,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60),
  });

  console.log(`Registering ${operatorName} — ${calls.length} calls`);
  for (const call of calls) {
    const data = encodeCall(call);
    console.log(`  -> ${call.functionName}(${call.args.join(", ")})`);
    const hash = await walletClient.sendTransaction({ to: call.address, data });
    console.log(`     tx: ${hash}`);
  }

  console.log(`Done. attestation_build_hash used (STUB): ${attestationBuildHash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
