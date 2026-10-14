//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";

contract UpgradeVaultDiamond is Script {
    function run() external {
        address vault = vm.envAddress("VAULT");
        uint256 action = vm.envUint("CUT_ACTION");
        require(vault.code.length > 0, "Vault has no code");
        require(action <= uint256(IDiamond.FacetCutAction.Remove), "Invalid cut action");

        address facet = action == uint256(IDiamond.FacetCutAction.Remove) ? address(0) : vm.envAddress("FACET");
        bytes[] memory rawSelectors = vm.envBytes("SELECTORS", ",");
        bytes4[] memory selectors = new bytes4[](rawSelectors.length);
        require(selectors.length > 0, "No selectors");
        for (uint256 i; i < selectors.length; i++) {
            require(rawSelectors[i].length == 4, "Selector must be four bytes");
            selectors[i] = bytes4(rawSelectors[i]);
        }

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut(facet, IDiamond.FacetCutAction(action), selectors);

        vm.startBroadcast();
        IDiamondCut(vault).diamondCut(cut, address(0), "");
        vm.stopBroadcast();
    }
}
