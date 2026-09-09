// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {PermissionedRegistry} from "contracts-v2/src/registry/PermissionedRegistry.sol";
import {ILabelStore} from "contracts-v2/src/utils/interfaces/ILabelStore.sol";
import {RegistryRolesLib} from "contracts-v2/src/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolverLib} from "contracts-v2/src/resolver/libraries/PermissionedResolverLib.sol";
import {IPermissionedResolver} from "contracts-v2/src/resolver/interfaces/IPermissionedResolver.sol";
import {IVerifiableFactory} from "@ensdomains/verifiable-factory/IVerifiableFactory.sol";

import {WatchdogRevoker} from "../src/WatchdogRevoker.sol";
import {IDvodResolver} from "../src/interfaces/IDvodResolver.sol";

/// @notice One-time DVoD infra deployment on Sepolia: a fresh subregistry for the
///         parent test name, a shared PermissionedResolver proxy, and WatchdogRevoker.
///
///         DOES NOT REGISTER THE PARENT NAME ITSELF. Registering a real .eth 2LD
///         (e.g. "dvod-test.eth") goes through ETHRegistrar's stablecoin-payment flow,
///         which the ENS Sepolia app UI already does correctly — do that by hand with
///         the same wallet as DEPLOYER_ADDRESS below, then call
///         ETHRegistry.setSubregistry(tokenId, <this script's Subregistry output>) and
///         ETHRegistry.setResolver(tokenId, <this script's ResolverProxy output>) as
///         that name's owner. See docs/ensv2-sepolia-deploy.md.
///
/// Addresses below are verified from ensdomains/contracts-v2's own *current* Sepolia
/// deployment artifacts (contracts/deployments/sepolia/*.json — not the dated
/// `sepolia-official-v1-20260525-r2` snapshot, which turned out to be stale: a
/// `git log` on PermissionedResolver.sol showed a `main`-branch change on 2026-07-03,
/// after that snapshot's date, and a Sepolia-fork dry run against the dated addresses
/// reverted with empty data on `initialize` — exactly the "live docs/deployment win"
/// case the brief warns about. Re-verified against the undated directory, fetched
/// 2026-09-09.
contract DeploySepoliaInfra is Script {
    address constant LABEL_STORE = 0xB03524289C16424f71802A1794c29c7Bd1B9f577;
    address constant PERMISSIONED_RESOLVER_IMPL = 0x7E4B2d59938930168024201752EE5503df402303;
    address constant VERIFIABLE_FACTORY = 0x118Bc31A50d559F7015a8Da26d54B3b030CdB70F;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Subregistry for the parent test name (e.g. "dvod-test.eth"). Deployer holds
        // ROLE_REGISTRAR so it can register operator subnames directly.
        PermissionedRegistry subregistry = new PermissionedRegistry(
            ILabelStore(LABEL_STORE),
            deployer,
            RegistryRolesLib.ROLE_REGISTRAR | RegistryRolesLib.ROLE_REGISTRAR_ADMIN
                | RegistryRolesLib.ROLE_SET_RESOLVER | RegistryRolesLib.ROLE_SET_RESOLVER_ADMIN
        );

        // Shared resolver proxy: deployer gets ROOT admin roles over SET_TEXT/SET_DATA/
        // SET_ADDR, so it can later delegate specific per-node record roles to each
        // operator's operational key and to WatchdogRevoker (see
        // packages/identity/ens buildRegisterOperatorCalls — that's where the
        // per-operator authorizeTextRoles/authorizeDataRoles calls happen, not here).
        uint256 resolverAdminRoles = PermissionedResolverLib.ROLE_SET_TEXT
            | PermissionedResolverLib.ROLE_SET_TEXT_ADMIN | PermissionedResolverLib.ROLE_SET_DATA
            | PermissionedResolverLib.ROLE_SET_DATA_ADMIN | PermissionedResolverLib.ROLE_SET_ADDR
            | PermissionedResolverLib.ROLE_SET_ADDR_ADMIN;

        bytes memory initData = abi.encodeCall(
            IPermissionedResolver.initialize, (deployer, resolverAdminRoles, new bytes[](0))
        );
        address resolverProxy = IVerifiableFactory(VERIFIABLE_FACTORY).deployProxy(
            PERMISSIONED_RESOLVER_IMPL, uint256(keccak256("dvod-test.eth-resolver")), initData
        );

        WatchdogRevoker watchdog = new WatchdogRevoker(IDvodResolver(resolverProxy), deployer);

        vm.stopBroadcast();

        console2.log("Deployer:            ", deployer);
        console2.log("Subregistry:         ", address(subregistry));
        console2.log("ResolverProxy:       ", resolverProxy);
        console2.log("WatchdogRevoker:     ", address(watchdog));
        console2.log("");
        console2.log("Next (manual, via the ENS Sepolia app, same wallet):");
        console2.log("  1. Register the parent test name (e.g. dvod-test.eth) via ETHRegistrar.");
        console2.log("  2. ETHRegistry.setSubregistry(tokenId, Subregistry printed above)");
        console2.log("  3. ETHRegistry.setResolver(tokenId, ResolverProxy printed above)");
    }
}
