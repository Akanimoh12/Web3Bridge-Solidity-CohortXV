
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";

contract ManageEmergencyFacet is Script {
    error InvalidAction();

    function run() external {
        address diamondAddress = vm.envAddress("DIAMOND_ADDRESS");
        string memory action = vm.envString("ACTION");

        IDiamond.FacetCutAction cutAction;
        bool deployFacet;

        if (keccak256(bytes(action)) == keccak256(bytes("add"))) {
            cutAction = IDiamond.FacetCutAction.Add;
            deployFacet = true;
        } else if (
            keccak256(bytes(action)) == keccak256(bytes("replace"))
        ) {
            cutAction = IDiamond.FacetCutAction.Replace;
            deployFacet = true;
        } else if (
            keccak256(bytes(action)) == keccak256(bytes("remove"))
        ) {
            cutAction = IDiamond.FacetCutAction.Remove;
        } else {
            revert InvalidAction();
        }

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = EmergencyFacet.emergencyWithdraw.selector;

        vm.startBroadcast();

        address facetAddress = address(0);

        if (deployFacet) {
            EmergencyFacet facet = new EmergencyFacet();
            facetAddress = address(facet);
        }

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);

        cut[0] = IDiamond.FacetCut({
            facetAddress: facetAddress,
            action: cutAction,
            functionSelectors: selectors
        });

        IDiamondCut(diamondAddress).diamondCut(
            cut,
            address(0),
            ""
        );

        vm.stopBroadcast();

        console.log("Emergency facet action:", action);
        console.log("Facet address:", facetAddress);
        console.log("Diamond address:", diamondAddress);
    }
}
