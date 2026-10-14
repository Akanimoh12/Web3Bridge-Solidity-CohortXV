//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {EmergencyInit} from "../src/diamond/upgradeInitializers/EmergencyInit.sol";

contract AddEmergencyFacet is Script {
    function run() external {
        address diamond = vm.envAddress("DIAMOND");

        vm.startBroadcast();

        EmergencyFacet facet = new EmergencyFacet();
        EmergencyInit init = new EmergencyInit();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(facet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        IDiamondCut(diamond).diamondCut(
            cut,
            address(init),
            abi.encodeCall(EmergencyInit.init, (1000)) // 1000 bps = 10%
        );

        vm.stopBroadcast();

        console.log("EmergencyFacet deployed to:", address(facet));
        console.log("EmergencyInit deployed to:", address(init));
    }
}