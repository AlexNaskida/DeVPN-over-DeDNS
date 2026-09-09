// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AttestationRefresherReceiver} from "../src/AttestationRefresherReceiver.sol";
import {ReceiverTemplate} from "../src/keystone/ReceiverTemplate.sol";
import {CapabilityRecordKeys} from "../src/CapabilityRecordKeys.sol";
import {MockDvodResolver} from "./mocks/MockDvodResolver.sol";

contract AttestationRefresherReceiverTest is Test {
    MockDvodResolver resolver;
    AttestationRefresherReceiver receiver;

    address forwarder = address(0xF0512A2D);
    bytes32 node = keccak256("carol.dvod-test.eth");

    function setUp() public {
        resolver = new MockDvodResolver();
        receiver = new AttestationRefresherReceiver(forwarder, resolver);
        resolver.setWriter(node, CapabilityRecordKeys.ATTESTATION_BUILD_HASH, address(receiver));
    }

    function test_onReport_fromForwarder_writesNewHash() public {
        bytes32 newHash = keccak256("a fresh build of the relay binary");
        bytes memory report = abi.encode(node, newHash);
        bytes memory metadata = new bytes(74);

        vm.expectEmit(true, false, false, true);
        emit AttestationRefresherReceiver.AttestationRefreshed(node, newHash);

        vm.prank(forwarder);
        receiver.onReport(metadata, report);

        bytes32 stored = abi.decode(
            resolver.data(node, CapabilityRecordKeys.ATTESTATION_BUILD_HASH), (bytes32)
        );
        assertEq(stored, newHash);
    }

    function test_onReport_rejectsNonForwarderCaller() public {
        bytes32 newHash = keccak256("attacker-supplied hash");
        bytes memory report = abi.encode(node, newHash);
        bytes memory metadata = new bytes(74);

        vm.expectRevert(
            abi.encodeWithSelector(
                ReceiverTemplate.InvalidSender.selector, address(0xBEEF), forwarder
            )
        );
        vm.prank(address(0xBEEF));
        receiver.onReport(metadata, report);
    }

    function test_forwarderAddress_setAtConstruction() public view {
        assertEq(receiver.getForwarderAddress(), forwarder);
    }
}
