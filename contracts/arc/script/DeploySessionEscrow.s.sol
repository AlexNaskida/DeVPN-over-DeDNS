// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {SessionEscrow} from "../src/SessionEscrow.sol";

/// @notice Deploys SessionEscrow to Arc testnet (chain id 5042002, RPC
///         https://rpc.testnet.arc.io - verified from docs.arc.io/arc/references/
///         connect-to-arc, fetched 2026-09-10). USDC is Arc's native gas/value
///         token, so no ERC-20 setup is needed here.
contract DeploySessionEscrow is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        SessionEscrow escrow = new SessionEscrow(deployer);
        vm.stopBroadcast();

        console2.log("Deployer/admin:", deployer);
        console2.log("SessionEscrow:", address(escrow));
    }
}
