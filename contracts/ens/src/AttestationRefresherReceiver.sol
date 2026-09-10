// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ReceiverTemplate} from "./keystone/ReceiverTemplate.sol";
import {IDvodResolver} from "./interfaces/IDvodResolver.sol";
import {CapabilityRecordKeys} from "./CapabilityRecordKeys.sol";

/// @notice Receives a CRE (Chainlink Runtime Environment) DON-signed report and uses
///         it to refresh one operator's `dvod.attestation_build_hash` record on the
///         shared PermissionedResolver. This is the real half of Phase 3's CRE
///         integration - see relay/handler_cre/attestation-refresher for the actual
///         workflow that produces the report; the tunnel/DNS/proxy handler itself is
///         a separate, honestly-labeled SIMULATED process (CRE cannot run persistent
///         network servers - see docs/chainlink-cre-findings.md).
///
///         `_processReport` is only ever invoked by `ReceiverTemplate.onReport`,
///         which itself only accepts calls from the configured KeystoneForwarder -
///         so this contract can only write what a genuine DON-consensus-verified CRE
///         report says, never an arbitrary caller.
contract AttestationRefresherReceiver is ReceiverTemplate {
    IDvodResolver public immutable RESOLVER;

    event AttestationRefreshed(bytes32 indexed node, bytes32 newHash);

    constructor(address forwarder, IDvodResolver resolver) ReceiverTemplate(forwarder) {
        RESOLVER = resolver;
    }

    /// @dev report = abi.encode(bytes32 node, bytes32 newHash)
    function _processReport(bytes calldata report) internal override {
        (bytes32 node, bytes32 newHash) = abi.decode(report, (bytes32, bytes32));
        RESOLVER.setData(node, CapabilityRecordKeys.ATTESTATION_BUILD_HASH, abi.encode(newHash));
        emit AttestationRefreshed(node, newHash);
    }
}
