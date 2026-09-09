// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @notice `data(node, key)` record keys used for a DVoD operator's ENSv2 capability
///         record (brief §7.2). `dvod.endpoint`, `dvod.tiers_supported`, and
///         `dvod.attestation_build_hash` are writable by the operational key.
///         `dvod.payout_address` is set once at registration and never re-delegated.
///         `dvod.status` is writable only by WatchdogRevoker (or, in the manual
///         fallback, the admin) — never by the operational key.
library CapabilityRecordKeys {
    string internal constant ENDPOINT = "dvod.endpoint";
    string internal constant TIERS_SUPPORTED = "dvod.tiers_supported";
    string internal constant ATTESTATION_BUILD_HASH = "dvod.attestation_build_hash";
    string internal constant PAYOUT_ADDRESS = "dvod.payout_address";
    string internal constant STATUS = "dvod.status";

    bytes internal constant STATUS_ACTIVE = "active";
    bytes internal constant STATUS_REVOKED = "revoked";
}
