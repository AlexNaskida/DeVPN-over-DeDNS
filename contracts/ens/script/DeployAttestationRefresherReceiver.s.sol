// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {AttestationRefresherReceiver} from "../src/AttestationRefresherReceiver.sol";
import {IDvodResolver} from "../src/interfaces/IDvodResolver.sol";

/// @notice Deploys the CRE receiver to Sepolia. KEYSTONE_FORWARDER is the real
///         CRE KeystoneForwarder address on Sepolia, quoted from the keeper-bot-ts
///         template's own README (fetched 2026-09-10): only this address can ever
///         call onReport, so only a genuine DON-consensus-verified CRE report can
///         cause a write.
contract DeployAttestationRefresherReceiver is Script {
    address constant KEYSTONE_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;
    address constant RESOLVER = 0x0F98C60F734B363Cab6e2B64c74fedC7D9075baF;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        AttestationRefresherReceiver receiver =
            new AttestationRefresherReceiver(KEYSTONE_FORWARDER, IDvodResolver(RESOLVER));
        vm.stopBroadcast();

        console2.log("AttestationRefresherReceiver:", address(receiver));
    }
}
