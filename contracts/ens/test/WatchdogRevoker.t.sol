// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {WatchdogRevoker} from "../src/WatchdogRevoker.sol";
import {CapabilityRecordKeys} from "../src/CapabilityRecordKeys.sol";
import {MockDvodResolver} from "./mocks/MockDvodResolver.sol";

contract WatchdogRevokerTest is Test {
    MockDvodResolver resolver;
    WatchdogRevoker watchdog;

    address admin = address(0xADA1);
    bytes32 node = keccak256("bob.dvod.eth");
    bytes buildBinary = "the-real-audited-cre-handler-binary";
    bytes32 publishedHash;

    function setUp() public {
        resolver = new MockDvodResolver();
        watchdog = new WatchdogRevoker(resolver, admin);

        publishedHash = keccak256(buildBinary);
        resolver.seedData(node, CapabilityRecordKeys.ATTESTATION_BUILD_HASH, abi.encode(publishedHash));
        resolver.seedData(node, CapabilityRecordKeys.STATUS, CapabilityRecordKeys.STATUS_ACTIVE);

        // Only the watchdog contract holds the (mocked) role to write this node's status -
        // mirrors authorizeDataRoles(toName, "dvod.status", address(watchdog), true) on the
        // real resolver.
        resolver.setWriter(node, CapabilityRecordKeys.STATUS, address(watchdog));
    }

    function test_validAttestation_doesNotRevoke() public {
        bool revoked = watchdog.submitAttestationCheck(node, buildBinary);
        assertFalse(revoked);
        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_ACTIVE);
    }

    function test_tamperedAttestation_triggersRevoke() public {
        bytes memory tampered = "a-different-binary-entirely";

        vm.expectEmit(true, true, false, true);
        emit WatchdogRevoker.Revoked(node, address(this), "attestation_mismatch");

        watchdog.submitAttestationCheck(node, tampered);

        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_REVOKED);
    }

    function test_doubleRevoke_isANoOp() public {
        bytes memory tampered = "a-different-binary-entirely";
        watchdog.submitAttestationCheck(node, tampered);
        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_REVOKED);

        // Second submission of the same (still-true) fact must not revert and must not
        // re-emit - it's a no-op, not an error.
        vm.recordLogs();
        watchdog.submitAttestationCheck(node, tampered);
        assertEq(vm.getRecordedLogs().length, 0);
        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_REVOKED);
    }

    function test_onlyWatchdogAddress_canActuallyRevoke_evenThoughSubmittingIsPermissionless() public {
        // Submitting a check is permissionless - any address can call it (this test's
        // sender is neither the admin nor a preconfigured writer).
        vm.prank(address(0xBEEF));
        watchdog.submitAttestationCheck(node, "a-different-binary-entirely");
        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_REVOKED);

        // But an arbitrary address cannot call the resolver directly to revoke a
        // *different* operator - only the watchdog contract's own address is authorized.
        bytes32 otherNode = keccak256("carol.dvod.eth");
        resolver.seedData(otherNode, CapabilityRecordKeys.STATUS, CapabilityRecordKeys.STATUS_ACTIVE);
        resolver.setWriter(otherNode, CapabilityRecordKeys.STATUS, address(watchdog));

        vm.prank(address(0xBEEF));
        vm.expectRevert();
        resolver.setData(otherNode, CapabilityRecordKeys.STATUS, CapabilityRecordKeys.STATUS_REVOKED);
    }

    function test_adminRevoke_manualFallback_onlyCallableByAdmin() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(WatchdogRevoker.NotAdmin.selector, address(0xBEEF)));
        watchdog.adminRevoke(node);

        vm.prank(admin);
        watchdog.adminRevoke(node);
        assertEq(resolver.data(node, CapabilityRecordKeys.STATUS), CapabilityRecordKeys.STATUS_REVOKED);
    }

    function test_submitMisbehaviorProof_isAnHonestlyLabeledStub() public {
        vm.expectRevert(WatchdogRevoker.MisbehaviorProofNotImplemented.selector);
        watchdog.submitMisbehaviorProof(node, "");
    }
}
