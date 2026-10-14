// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";

contract UpgradeEmergencyFacet is Script {
    function run() external {
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");

        vm.startBroadcast();

        EmergencyFacet emergencyFacet = new EmergencyFacet();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);

        cut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        IDiamondCut(vaultAddress).diamondCut(cut, address(0), "");

        console.log("EmergencyFacet deployed to:", address(emergencyFacet));
        console.log("Updated Diamond:", vaultAddress);

        vm.stopBroadcast();
    }
}
