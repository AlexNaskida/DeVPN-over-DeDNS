// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IDvodResolver} from "../../src/interfaces/IDvodResolver.sol";

/// @notice Mimics the one invariant of ENSv2's real PermissionedResolver that
///         WatchdogRevoker's security depends on: `setData(node, key, ...)` only
///         succeeds for whichever address was granted `ROLE_SET_DATA` scoped to
///         `(node, partHash(key))` — not for an arbitrary caller. Real role-granting
///         (`authorizeDataRoles`) is out of scope for this mock; `setWriter` stands in
///         for "the resolver's real EAC role table says this address may write this key
///         for this node."
contract MockDvodResolver is IDvodResolver {
    mapping(bytes32 => mapping(bytes32 => bytes)) internal _data;
    mapping(bytes32 => mapping(bytes32 => address)) internal _writer;

    error NotAuthorizedWriter(bytes32 node, string key, address caller);

    function setWriter(bytes32 node, string calldata key, address writer) external {
        _writer[node][keccak256(bytes(key))] = writer;
    }

    function seedData(bytes32 node, string calldata key, bytes calldata value) external {
        _data[node][keccak256(bytes(key))] = value;
    }

    function data(bytes32 node, string calldata key) external view returns (bytes memory) {
        return _data[node][keccak256(bytes(key))];
    }

    function setData(bytes32 node, string calldata key, bytes calldata value) external {
        bytes32 keyHash = keccak256(bytes(key));
        if (_writer[node][keyHash] != msg.sender) {
            revert NotAuthorizedWriter(node, key, msg.sender);
        }
        _data[node][keyHash] = value;
    }
}
