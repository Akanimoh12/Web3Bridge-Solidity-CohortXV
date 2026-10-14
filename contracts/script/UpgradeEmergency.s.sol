// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {EmergencyFacetV2} from "../src/diamond/facets/EmergencyFacetV2.sol";

contract UpgradeEmergency is Script {
    function applyCut(address diamond, address facet, IDiamond.FacetCutAction action) internal {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = EmergencyFacet.emergencyWithdraw.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);

        cuts[0] = IDiamond.FacetCut({facetAddress: facet, action: action, functionSelectors: selectors});

        IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    }

    function run() external {
        address diamond = vm.envAddress("DIAMOND");
        bytes4 selector = EmergencyFacet.emergencyWithdraw.selector;

        require(IDiamondLoupe(diamond).facetAddress(selector) == address(0), "Emergency function already registered");

        vm.startBroadcast();

        // 1. ADD
        EmergencyFacet v1 = new EmergencyFacet();
        applyCut(diamond, address(v1), IDiamond.FacetCutAction.Add);

        require(IDiamondLoupe(diamond).facetAddress(selector) == address(v1), "Add verification failed");

        // 2. REPLACE
        EmergencyFacetV2 v2 = new EmergencyFacetV2();
        applyCut(diamond, address(v2), IDiamond.FacetCutAction.Replace);

        require(IDiamondLoupe(diamond).facetAddress(selector) == address(v2), "Replace verification failed");

        // 3. REMOVE
        applyCut(diamond, address(0), IDiamond.FacetCutAction.Remove);

        require(IDiamondLoupe(diamond).facetAddress(selector) == address(0), "Remove verification failed");

        // 4. RESTORE
        applyCut(diamond, address(v2), IDiamond.FacetCutAction.Add);

        require(IDiamondLoupe(diamond).facetAddress(selector) == address(v2), "Restore verification failed");

        vm.stopBroadcast();

        console.log("DIAMOND:", diamond);
        console.log("V1 FACET:", address(v1));
        console.log("V2 FACET:", address(v2));
        console.log("ADD, REPLACE, REMOVE, RESTORE completed");
    }
}
