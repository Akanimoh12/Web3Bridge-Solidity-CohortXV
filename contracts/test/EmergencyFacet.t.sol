
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";

import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";

import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";

contract EmergencyFacetTest is Test {
    Diamond diamond;
    SavingsFacet savings;
    EmergencyFacet emergencyFacet;

    function setUp() public {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        SavingsFacet savingsFacet = new SavingsFacet();
        EmergencyFacet emergency = new EmergencyFacet();
        VaultInit initializer = new VaultInit();

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](5);

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(cutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondCut()
        });

        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(loupeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondLoupe()
        });

        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(ownershipFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.ownership()
        });

        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(savingsFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.savings()
        });

        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(emergency),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        DiamondArgs memory args = DiamondArgs({
            owner: address(this),
            init: address(initializer),
            initCalldata: abi.encodeWithSelector(
                VaultInit.init.selector,
                uint256(60)
            )
        });

        diamond = new Diamond(cuts, args);
        savings = SavingsFacet(payable(address(diamond)));
        emergencyFacet = EmergencyFacet(payable(address(diamond)));

        vm.deal(address(this), 10 ether);
    }

    function testEmergencyWithdrawDeductsTenPercent() public {
        savings.deposit{value: 1 ether}(3600);

        uint256 balanceBefore = address(this).balance;

        emergencyFacet.emergencyWithdraw();

        assertEq(address(this).balance, balanceBefore + 0.9 ether);
        assertEq(address(diamond).balance, 0.1 ether);
        assertEq(savings.totalSaved(), 0);

        (uint256 amount, uint64 unlockTime) =
            savings.savings(address(this));

        assertEq(amount, 0);
        assertEq(unlockTime, 0);
    }

    function testEmergencyWithdrawWithoutSavingsReverts() public {
        vm.expectRevert();
        emergencyFacet.emergencyWithdraw();
    }

    receive() external payable {}
}
