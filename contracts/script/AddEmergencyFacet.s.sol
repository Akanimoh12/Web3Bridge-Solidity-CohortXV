//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";

contract AddEmergencyFacet is Script {
    function run() external returns (address facetAddress) {
        address vault = vm.envAddress("VAULT");

        vm.startBroadcast();

        EmergencyFacet emergencyFacet = new EmergencyFacet();
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        IDiamondCut(vault).diamondCut(cut, address(0), "");

        vm.stopBroadcast();

        facetAddress = address(emergencyFacet);
        console.log("EmergencyFacet added at:", facetAddress);
        console.log("VAULT (Diamond):", vault);
    }
}
