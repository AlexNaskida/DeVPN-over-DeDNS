// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IDvodResolver} from "./interfaces/IDvodResolver.sol";
import {CapabilityRecordKeys} from "./CapabilityRecordKeys.sol";

/// @notice Holds the `ROLE_SET_DATA` permission (scoped to each registered operator's
///         `dvod.status` key) on the shared DVoD PermissionedResolver. Nothing else can
///         flip an operator's status - see brief §2.3/§7.3.
///
///         Anyone may *submit* a check or proof (`submitAttestationCheck`,
///         `submitMisbehaviorProof`); only this contract's own logic ever calls
///         `resolver.setData(..., STATUS, ...)`, and the resolver itself enforces that
///         only an address holding that role - granted to this contract's address alone
///         at operator registration - can succeed. A caller cannot revoke by calling the
///         resolver directly; they can only ask this contract to verify and act.
contract WatchdogRevoker {
    IDvodResolver public immutable RESOLVER;
    address public immutable ADMIN;

    event Revoked(bytes32 indexed node, address indexed submittedBy, string reason);
    event AdminRevoked(bytes32 indexed node, address indexed admin);

    error NotAdmin(address caller);
    error MisbehaviorProofNotImplemented();

    modifier onlyAdmin() {
        _checkOnlyAdmin();
        _;
    }

    constructor(IDvodResolver resolver_, address admin_) {
        RESOLVER = resolver_;
        ADMIN = admin_;
    }

    function _checkOnlyAdmin() internal view {
        if (msg.sender != ADMIN) revert NotAdmin(msg.sender);
    }

    /// @notice Pure cryptographic verification, no oracle: revokes `node` if the
    ///         provided attestation report's hash doesn't match the operator's own
    ///         published `dvod.attestation_build_hash` record. A valid (matching)
    ///         report passes with no state change.
    /// @dev Permissionless to call - anyone can submit a check - but only this
    ///      contract's address can make the resulting `setData` call succeed.
    /// @return revoked True if this call caused a revoke; false if the attestation was
    ///         valid, or the operator was already revoked (no-op).
    function submitAttestationCheck(bytes32 node, bytes calldata attestationReport) external returns (bool revoked) {
        bytes32 publishedHash = abi.decode(RESOLVER.data(node, CapabilityRecordKeys.ATTESTATION_BUILD_HASH), (bytes32));
        if (keccak256(attestationReport) == publishedHash) {
            return false;
        }
        return _revoke(node, "attestation_mismatch");
    }

    /// @notice STUB: permissionless misbehavior-proof trigger (brief §2.3, stretch goal).
    ///         Not implemented for Phase 1 - the attestation-failure trigger above and
    ///         `adminRevoke` below are the two working revoke paths. Wire this up if
    ///         time allows; until then it reverts loudly rather than silently no-op'ing.
    function submitMisbehaviorProof(bytes32, bytes calldata) external pure {
        revert MisbehaviorProofNotImplemented();
    }

    /// @notice Manual fallback revoke path - documented as such per brief §2.3/§7.3.
    ///         Only used because the misbehavior-proof trigger isn't built yet; swap the
    ///         demo to the automatic path once it is. This is a human admin key in the
    ///         happy-path loop, which the README must state plainly.
    function adminRevoke(bytes32 node) external onlyAdmin {
        if (_revoke(node, "admin_manual_revoke")) {
            emit AdminRevoked(node, msg.sender);
        }
    }

    /// @dev Double-revoke is a no-op: if `node` is already revoked, returns false
    ///      without reverting or writing again, rather than erroring on a second
    ///      submission of the same (still-true) fact.
    function _revoke(bytes32 node, string memory reason) internal returns (bool revoked) {
        bytes memory currentStatus = RESOLVER.data(node, CapabilityRecordKeys.STATUS);
        if (keccak256(currentStatus) == keccak256(CapabilityRecordKeys.STATUS_REVOKED)) {
            return false;
        }
        RESOLVER.setData(node, CapabilityRecordKeys.STATUS, CapabilityRecordKeys.STATUS_REVOKED);
        emit Revoked(node, msg.sender, reason);
        return true;
    }
}
