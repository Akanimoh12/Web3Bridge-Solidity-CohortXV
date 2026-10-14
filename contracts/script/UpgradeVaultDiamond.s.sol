// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {IERC173} from "lib/diamond-1-hardhat/contracts/interfaces/IERC173.sol";
import {VaultHelperFacet} from "../src/diamond/facets/VaultHelperFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {SavingsFacetV2} from "../src/diamond/facets/SavingsFacetV2.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";

contract UpgradeVaultDiamond is Script {
    address public constant DEFAULT_SEPOLIA_DIAMOND = 0xEA965856eecAfB4Cb4F1ea868e7920A7e7B806c9;

    function run() external {
        address diamond = vm.envOr("VAULT_DIAMOND", DEFAULT_SEPOLIA_DIAMOND);
        address deployer = vm.envOr("OWNER", msg.sender);

        console.log("=== Diamond Upgrade Pre-flight Checks ===");
        console.log("Target Diamond:", diamond);
        console.log("Deployer / Expected Owner:", deployer);
        console.log("Chain ID:", block.chainid);

        // Safety Check 1: Target proxy has deployed bytecode
        require(diamond.code.length > 0, "UpgradeScript: Target Diamond has no bytecode");

        // Safety Check 2: Verify caller/deployer is the Diamond contract owner
        address currentOwner = IERC173(diamond).owner();
        console.log("Current Diamond Owner:", currentOwner);
        require(currentOwner == deployer, "UpgradeScript: Caller is not Diamond owner");

        IDiamondLoupe loupe = IDiamondLoupe(diamond);

        // Safety Check 3: Verify ADD selectors for VaultHelperFacet are not already installed
        bytes4[] memory helperSelectors = VaultSelectors.vaultHelper();
        for (uint256 i = 0; i < helperSelectors.length; i++) {
            address existingFacet = loupe.facetAddress(helperSelectors[i]);
            require(existingFacet == address(0), "UpgradeScript: VaultHelper selector already installed");
        }

        // Safety Check 4: Verify ADD selectors for EmergencyFacet are not already installed
        bytes4[] memory emergencySelectors = VaultSelectors.emergency();
        for (uint256 i = 0; i < emergencySelectors.length; i++) {
            address existingFacet = loupe.facetAddress(emergencySelectors[i]);
            require(existingFacet == address(0), "UpgradeScript: Emergency selector already installed");
        }

        // Safety Check 5: Verify REPLACE selector version() currently exists and points to an active facet
        bytes4 versionSelector = SavingsFacetV2.version.selector;
        address oldVersionFacet = loupe.facetAddress(versionSelector);
        require(oldVersionFacet != address(0), "UpgradeScript: version() selector not found to replace");
        console.log("Current version() facet address:", oldVersionFacet);

        vm.startBroadcast();

        // 1. Deploy the 3 new facets
        VaultHelperFacet helperFacet = new VaultHelperFacet();
        EmergencyFacet emergencyFacet = new EmergencyFacet();
        SavingsFacetV2 savingsV2 = new SavingsFacetV2();

        console.log("Deployed VaultHelperFacet to:", address(helperFacet));
        console.log("Deployed EmergencyFacet to:", address(emergencyFacet));
        console.log("Deployed SavingsFacetV2 to:", address(savingsV2));

        // Safety Check 6: Verify new facets have code
        require(address(helperFacet).code.length > 0, "UpgradeScript: helperFacet deployment failed");
        require(address(emergencyFacet).code.length > 0, "UpgradeScript: emergencyFacet deployment failed");
        require(address(savingsV2).code.length > 0, "UpgradeScript: savingsV2 deployment failed");

        // 2. Prepare the Diamond cuts
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

        // Cut 0: ADD VaultHelperFacet selectors
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: helperSelectors
        });

        // Cut 1: ADD EmergencyFacet selectors
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: emergencySelectors
        });

        // Cut 2: REPLACE SavingsFacet.version with SavingsFacetV2
        bytes4[] memory replaceSelectors = new bytes4[](1);
        replaceSelectors[0] = versionSelector;
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(savingsV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: replaceSelectors
        });

        // 3. Execute Diamond Cut preserving Diamond address and existing storage
        IDiamondCut(diamond).diamondCut(cuts, address(0), "");

        vm.stopBroadcast();

        // Safety Check 7: Post-cut loupe verification
        for (uint256 i = 0; i < helperSelectors.length; i++) {
            require(loupe.facetAddress(helperSelectors[i]) == address(helperFacet), "UpgradeScript: Post-cut check failed for helper");
        }
        for (uint256 i = 0; i < emergencySelectors.length; i++) {
            require(loupe.facetAddress(emergencySelectors[i]) == address(emergencyFacet), "UpgradeScript: Post-cut check failed for emergency");
        }
        require(loupe.facetAddress(versionSelector) == address(savingsV2), "UpgradeScript: Post-cut check failed for version");

        console.log("=== Diamond Upgrade Executed and Verified Successfully! ===");
    }
}
