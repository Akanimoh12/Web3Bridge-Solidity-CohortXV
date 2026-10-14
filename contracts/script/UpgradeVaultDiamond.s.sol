//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultCuts} from "../src/diamond/VaultCuts.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultUpgradeInit} from "../src/diamond/upgradeInitializers/VaultUpgradeInit.sol";

// Upgrades an existing Vault Diamond in place (same address, same storage).
contract UpgradeVaultDiamond is Script {
    function run() external {
        address diamond = vm.envAddress("DIAMOND");

        vm.startBroadcast();

        EmergencyFacet emergencyFacet = new EmergencyFacet();
        VaultUpgradeInit upgradeInit = new VaultUpgradeInit();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = VaultCuts.add(address(emergencyFacet), VaultSelectors.emergency());

        // Other actions go in the same array, e.g.:
        //   cut[1] = VaultCuts.replace(address(newSavingsFacet), VaultSelectors.savings());
        //   cut[2] = VaultCuts.remove(selectorsToDrop);

        IDiamondCut(diamond).diamondCut(
            cut,
            address(upgradeInit),
            abi.encodeCall(VaultUpgradeInit.setVersion, ("2.0.0"))
        );

        vm.stopBroadcast();

        console.log("EmergencyFacet deployed to:", address(emergencyFacet));
        console.log("VaultUpgradeInit deployed to:", address(upgradeInit));
        console.log("VAULT (Diamond) upgraded at:", diamond);
    }
}
