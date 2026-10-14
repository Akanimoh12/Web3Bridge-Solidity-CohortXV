//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";

contract ReplaceEmergencyFacet is Script {
    function run() external {
        address diamond = vm.envAddress("DIAMOND");

        vm.startBroadcast();

        EmergencyFacet newFacet = new EmergencyFacet();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(newFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: VaultSelectors.emergency()
        });

        // No init needed: the 10% fee is already stored in the diamond
        IDiamondCut(diamond).diamondCut(cut, address(0), "");

        vm.stopBroadcast();

        console.log("New EmergencyFacet deployed to:", address(newFacet));
    }
}