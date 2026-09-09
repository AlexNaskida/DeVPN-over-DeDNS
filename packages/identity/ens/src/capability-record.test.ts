import { decodeAbiParameters, decodeFunctionData, encodeFunctionData, hexToString } from "viem";
import { describe, expect, it } from "vitest";

import { permissionedRegistryAbi } from "./abi.js";
import { buildRegisterOperatorCalls, type RegisterOperatorParams } from "./capability-record.js";
import { CAPABILITY_RECORD_KEYS, STATUS_ACTIVE } from "./keys.js";

const REGISTRY = "0x1000000000000000000000000000000000000001" as const;
const RESOLVER = "0x2000000000000000000000000000000000000002" as const;

const params: RegisterOperatorParams = {
  name: "bob.dvod.eth",
  ownerAddress: "0x1111111111111111111111111111111111111111",
  operationalKeyAddress: "0x2222222222222222222222222222222222222222",
  payoutAddress: "0x3333333333333333333333333333333333333333",
  endpoint: "https://relay-bob.example/tunnel",
  tiersSupported: ["lite", "standard"],
  attestationBuildHash: `0x${"ab".repeat(32)}`,
  watchdogAddress: "0x4444444444444444444444444444444444444444",
  expiry: 1893456000n,
};

describe("buildRegisterOperatorCalls", () => {
  const calls = buildRegisterOperatorCalls(REGISTRY, RESOLVER, params);

  it("registers the subname first, with the operator as owner and no registry roles", () => {
    const registerCall = calls.find((c) => c.functionName === "register")!;
    const decoded = decodeFunctionData({ abi: permissionedRegistryAbi, data: encode(registerCall) });
    expect(decoded.args[0]).toBe("bob");
    expect(decoded.args[1]).toBe(params.ownerAddress);
    expect(decoded.args[3]).toBe(RESOLVER);
    expect(decoded.args[4]).toBe(0n);
  });

  it("writes endpoint and tiers_supported as text records", () => {
    const endpointCall = findResolverCall(calls, "setText", CAPABILITY_RECORD_KEYS.endpoint);
    expect(endpointCall.args[2]).toBe(params.endpoint);

    const tiersCall = findResolverCall(calls, "setText", CAPABILITY_RECORD_KEYS.tiersSupported);
    expect(JSON.parse(tiersCall.args[2] as string)).toEqual(params.tiersSupported);
  });

  it("writes attestation_build_hash as a data record, decodable as bytes32", () => {
    const call = findResolverCall(calls, "setData", CAPABILITY_RECORD_KEYS.attestationBuildHash);
    expect(call.args[2]).toBe(params.attestationBuildHash);
  });

  it("writes payout_address as an abi-encoded address data record", () => {
    const call = findResolverCall(calls, "setData", CAPABILITY_RECORD_KEYS.payoutAddress);
    const [decoded] = decodeAbiParameters([{ type: "address" }], call.args[2] as `0x${string}`);
    expect(decoded).toBe(params.payoutAddress);
  });

  it("seeds status as active, raw-bytes encoded (not abi-encoded)", () => {
    const call = findResolverCall(calls, "setData", CAPABILITY_RECORD_KEYS.status);
    expect(hexToString(call.args[2] as `0x${string}`)).toBe(STATUS_ACTIVE);
  });

  it("grants the operational key roles for endpoint, tiers_supported, and attestation_build_hash only", () => {
    const grantedKeys = calls
      .filter((c) => c.functionName === "authorizeTextRoles" || c.functionName === "authorizeDataRoles")
      .filter((c) => c.args[2] === params.operationalKeyAddress)
      .map((c) => c.args[1]);

    expect(new Set(grantedKeys)).toEqual(
      new Set([
        CAPABILITY_RECORD_KEYS.endpoint,
        CAPABILITY_RECORD_KEYS.tiersSupported,
        CAPABILITY_RECORD_KEYS.attestationBuildHash,
      ]),
    );
  });

  it("never grants the operational key a role over payout_address or status", () => {
    const grantedToOperationalKey = calls
      .filter((c) => c.functionName === "authorizeTextRoles" || c.functionName === "authorizeDataRoles")
      .filter((c) => c.args[2] === params.operationalKeyAddress)
      .map((c) => c.args[1]);

    expect(grantedToOperationalKey).not.toContain(CAPABILITY_RECORD_KEYS.payoutAddress);
    expect(grantedToOperationalKey).not.toContain(CAPABILITY_RECORD_KEYS.status);
  });

  it("grants only the watchdog contract the role to write status", () => {
    const statusGrant = calls.find(
      (c) => c.functionName === "authorizeDataRoles" && c.args[1] === CAPABILITY_RECORD_KEYS.status,
    )!;
    expect(statusGrant.args[2]).toBe(params.watchdogAddress);
  });
});

function encode(call: { abi: unknown; functionName: string; args: readonly unknown[] }) {
  return encodeFunctionData({
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
  } as never);
}

function findResolverCall(
  calls: ReturnType<typeof buildRegisterOperatorCalls>,
  functionName: string,
  key: string,
) {
  const call = calls.find((c) => c.functionName === functionName && c.args[1] === key);
  if (!call) throw new Error(`no ${functionName} call found for key ${key}`);
  return call;
}
