// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {SessionEscrow} from "../src/SessionEscrow.sol";

contract SessionEscrowTest is Test {
    SessionEscrow escrow;
    address admin = address(0xADA1);
    address alice = address(0xA11CE);
    address relayPayout = address(0xBEEF);

    function setUp() public {
        escrow = new SessionEscrow(admin);
        vm.deal(alice, 100 ether);
    }

    function test_price_matchesBriefFormula() public view {
        assertEq(escrow.price(SessionEscrow.Tier.Lite, 1), 0.1 ether);
        assertEq(escrow.price(SessionEscrow.Tier.Standard, 1), 0.35 ether);
        assertEq(escrow.price(SessionEscrow.Tier.Turbo, 1), 1 ether);
        assertEq(escrow.price(SessionEscrow.Tier.Standard, 3), 1.05 ether);
    }

    function test_purchaseSession_realPaymentIssuesSession() public {
        vm.prank(alice);
        uint256 id = escrow.purchaseSession{value: 0.35 ether}(SessionEscrow.Tier.Standard, 1);

        (address payer, SessionEscrow.Tier tier, uint256 hoursBought, uint256 paid,, bool refunded)
        = escrow.sessions(id);

        assertEq(payer, alice);
        assertEq(uint8(tier), uint8(SessionEscrow.Tier.Standard));
        assertEq(hoursBought, 1);
        assertEq(paid, 0.35 ether);
        assertFalse(refunded);
        assertEq(address(escrow).balance, 0.35 ether);
    }

    function test_purchaseSession_rejectsWrongPayment() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(SessionEscrow.IncorrectPayment.selector, 0.35 ether, 0.1 ether)
        );
        escrow.purchaseSession{value: 0.1 ether}(SessionEscrow.Tier.Standard, 1);
    }

    function test_purchaseSession_rejectsZeroOrExcessiveHours() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SessionEscrow.InvalidHours.selector, 0));
        escrow.purchaseSession{value: 0}(SessionEscrow.Tier.Lite, 0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SessionEscrow.InvalidHours.selector, 25));
        escrow.purchaseSession{value: 2.5 ether}(SessionEscrow.Tier.Lite, 25);
    }

    function test_payoutOperator_onlyAdmin() public {
        vm.prank(alice);
        escrow.purchaseSession{value: 1 ether}(SessionEscrow.Tier.Turbo, 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SessionEscrow.NotAdmin.selector, alice));
        escrow.payoutOperator(relayPayout, 1 ether);

        vm.prank(admin);
        escrow.payoutOperator(relayPayout, 1 ether);
        assertEq(relayPayout.balance, 1 ether);
    }

    function test_payoutOperator_rejectsMoreThanEscrowed() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(SessionEscrow.InsufficientEscrowBalance.selector, 1 ether, 0)
        );
        escrow.payoutOperator(relayPayout, 1 ether);
    }

    function test_refundSession_returnsFundsToPayer() public {
        vm.prank(alice);
        uint256 id = escrow.purchaseSession{value: 0.35 ether}(SessionEscrow.Tier.Standard, 1);

        uint256 aliceBalanceBefore = alice.balance;

        vm.prank(admin);
        escrow.refundSession(id);

        assertEq(alice.balance, aliceBalanceBefore + 0.35 ether);
        (,,,,, bool refunded) = escrow.sessions(id);
        assertTrue(refunded);
    }

    function test_refundSession_cannotDoubleRefund() public {
        vm.prank(alice);
        uint256 id = escrow.purchaseSession{value: 0.35 ether}(SessionEscrow.Tier.Standard, 1);

        vm.prank(admin);
        escrow.refundSession(id);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(SessionEscrow.SessionAlreadyRefunded.selector, id));
        escrow.refundSession(id);
    }

    function test_refundSession_onlyAdmin() public {
        vm.prank(alice);
        uint256 id = escrow.purchaseSession{value: 0.35 ether}(SessionEscrow.Tier.Standard, 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SessionEscrow.NotAdmin.selector, alice));
        escrow.refundSession(id);
    }
}
