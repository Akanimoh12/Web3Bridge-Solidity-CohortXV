//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {PauseFacet} from "../src/diamond/facets/PauseFacet.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";

contract UpgradeVaultPauseFacet is Script {
    function run() external returns (address pauseFacetAddress, address savingsFacetAddress) {
        address vault = vm.envAddress("VAULT");

        vm.startBroadcast();
        PauseFacet pauseFacet = new PauseFacet();
        SavingsFacet savingsFacet = new SavingsFacet();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](3);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: VaultSelectors.savings()
        });
        cut[1] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: VaultSelectors.emergency()
        });
        cut[2] = IDiamond.FacetCut({
            facetAddress: address(pauseFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.pause()
        });

        IDiamondCut(vault).diamondCut(cut, address(0), "");
        vm.stopBroadcast();

        pauseFacetAddress = address(pauseFacet);
        savingsFacetAddress = address(savingsFacet);
        console.log("PauseFacet deployed to:", pauseFacetAddress);
        console.log("SavingsFacet replacement deployed to:", savingsFacetAddress);
        console.log("VAULT upgraded:", vault);
    }
}
