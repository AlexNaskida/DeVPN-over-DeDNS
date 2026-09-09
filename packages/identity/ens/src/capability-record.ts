import { encodeAbiParameters, encodeFunctionData, namehash, stringToHex } from "viem";
import type { CapabilityRecord } from "@dvod/session-spec";

import { permissionedRegistryAbi, permissionedResolverAbi } from "./abi.js";
import { encodeDnsName } from "./dns-name.js";
import { CAPABILITY_RECORD_KEYS, STATUS_ACTIVE } from "./keys.js";

export interface RegisterOperatorParams {
  /** Full operator subname, e.g. "bob.dvod.eth". */
  name: string;
  /** ERC1155 owner of the registry entry — the operator's account. */
  ownerAddress: `0x${string}`;
  /** Distinguishes update-endpoint/capabilities authority from earnings custody. */
  operationalKeyAddress: `0x${string}`;
  payoutAddress: `0x${string}`;
  endpoint: string;
  tiersSupported: CapabilityRecord["tiers_supported"];
  attestationBuildHash: `0x${string}`;
  /** WatchdogRevoker contract address — the only account ever granted the role to
   *  write this operator's `dvod.status` record. */
  watchdogAddress: `0x${string}`;
  expiry: bigint;
}

export interface ContractCall {
  address: `0x${string}`;
  abi: typeof permissionedRegistryAbi | typeof permissionedResolverAbi;
  functionName: string;
  args: readonly unknown[];
}

/**
 * Builds the ordered sequence of on-chain calls to register a new DVoD relay
 * operator: create the subname (owner = operator's account, resolver = DVoD's shared
 * PermissionedResolver deployment), write its capability record, grant the
 * operational key exactly the record-level roles it needs (never `payout_address` or
 * `status`), and grant the watchdog contract — not a human — the role to revoke it.
 *
 * Caller must hold `SET_TEXT_ADMIN`/`SET_DATA_ADMIN` (typically via a root grant made
 * once when the shared resolver was deployed) to execute the `authorize*Roles` calls;
 * see contracts/ens/src/WatchdogRevoker.sol and brief §7.2/§7.3 for the invariant this
 * enforces. Each returned call is meant to run in this order, but is not itself a
 * multicall — callers on testnet may batch them via the resolver's own `multicall`.
 */
export function buildRegisterOperatorCalls(
  registryAddress: `0x${string}`,
  resolverAddress: `0x${string}`,
  params: RegisterOperatorParams,
): ContractCall[] {
  const label = params.name.split(".")[0];
  if (!label) {
    throw new Error(`cannot derive a label from operator name "${params.name}"`);
  }
  const node = namehash(params.name);
  const toName = encodeDnsName(params.name);

  return [
    {
      address: registryAddress,
      abi: permissionedRegistryAbi,
      functionName: "register",
      args: [
        label,
        params.ownerAddress,
        "0x0000000000000000000000000000000000000000",
        resolverAddress,
        0n, // operator gets no registry-level roles; only resolver record-level roles below
        params.expiry,
      ],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [node, CAPABILITY_RECORD_KEYS.endpoint, params.endpoint],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [node, CAPABILITY_RECORD_KEYS.tiersSupported, JSON.stringify(params.tiersSupported)],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "setData",
      args: [node, CAPABILITY_RECORD_KEYS.attestationBuildHash, params.attestationBuildHash],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "setData",
      args: [
        node,
        CAPABILITY_RECORD_KEYS.payoutAddress,
        encodeAbiParameters([{ type: "address" }], [params.payoutAddress]),
      ],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "setData",
      args: [node, CAPABILITY_RECORD_KEYS.status, stringToHex(STATUS_ACTIVE)],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "authorizeTextRoles",
      args: [toName, CAPABILITY_RECORD_KEYS.endpoint, params.operationalKeyAddress, true],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "authorizeTextRoles",
      args: [toName, CAPABILITY_RECORD_KEYS.tiersSupported, params.operationalKeyAddress, true],
    },
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "authorizeDataRoles",
      args: [
        toName,
        CAPABILITY_RECORD_KEYS.attestationBuildHash,
        params.operationalKeyAddress,
        true,
      ],
    },
    // Deliberately no authorizeDataRoles for payout_address or status to the
    // operational key — see the invariant this function's docstring points at.
    {
      address: resolverAddress,
      abi: permissionedResolverAbi,
      functionName: "authorizeDataRoles",
      args: [toName, CAPABILITY_RECORD_KEYS.status, params.watchdogAddress, true],
    },
  ];
}

/** Encodes one `ContractCall` for use with `walletClient.sendTransaction` / a multicall. */
export function encodeCall(call: ContractCall): `0x${string}` {
  return encodeFunctionData({
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
  } as never);
}

