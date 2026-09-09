// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @notice Minimal interface onto ENSv2's PermissionedResolver `data`/`setData` profile
///         (ENSIP-24), covering only what WatchdogRevoker needs. Signatures are copied
///         verbatim from ensdomains/contracts-v2 `PermissionedResolver.sol` (fetched
///         2026-09-09) — `setData` is itself permission-checked inside the real resolver
///         via `onlyPartRoles(node, partHash(key), ROLE_SET_DATA)`, so WatchdogRevoker can
///         only ever succeed at revoking an operator it was explicitly granted
///         `ROLE_SET_DATA` for, scoped to that operator's `dvod.status` key, at
///         registration time.
interface IDvodResolver {
    function data(bytes32 node, string calldata key) external view returns (bytes memory);
    function setData(bytes32 node, string calldata key, bytes calldata value) external;
}
