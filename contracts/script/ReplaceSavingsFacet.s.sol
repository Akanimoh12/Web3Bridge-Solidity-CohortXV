//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {SavingsFacetV2} from "../src/diamond/facets/SavingsFacetV2.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";

contract ReplaceSavingsFacet is Script {
    function run() external returns (address facetAddress) {
        address vault = vm.envAddress("VAULT");

        vm.startBroadcast();

        SavingsFacetV2 savingsFacetV2 = new SavingsFacetV2();
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](2);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: VaultSelectors.savingsV2()
        });
        cut[1] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: VaultSelectors.version()
        });

        IDiamondCut(vault).diamondCut(cut, address(0), "");

        vm.stopBroadcast();

        facetAddress = address(savingsFacetV2);
        console.log("SavingsFacetV2 deployed to:", facetAddress);
        console.log("SavingsFacet replaced and version() removed from:", vault);
    }
}
