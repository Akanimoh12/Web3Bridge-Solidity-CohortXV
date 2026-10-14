//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {PauseFacet} from "../src/diamond/facets/PauseFacet.sol";
import {VaultBase} from "../src/diamond/VaultBase.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";

contract PauseFacetTest is Test {
    address private constant USER = address(0x1234);

    Diamond private vault;
    SavingsFacet private savingsFacet;
    PauseFacet private pauseFacet;

    function setUp() public {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        savingsFacet = new SavingsFacet();
        EmergencyFacet emergencyFacet = new EmergencyFacet();
        VaultInit vaultInit = new VaultInit();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](5);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(cutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondCut()
        });
        cut[1] = IDiamond.FacetCut({
            facetAddress: address(loupeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondLoupe()
        });
        cut[2] = IDiamond.FacetCut({
            facetAddress: address(ownershipFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.ownership()
        });
        cut[3] = IDiamond.FacetCut({
            facetAddress: address(savingsFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.savings()
        });
        cut[4] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        DiamondArgs memory args = DiamondArgs({
            owner: address(this),
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, 60)
        });
        vault = new Diamond(cut, args);

        _upgradeToPauseFacet();
    }

    function testUpgradeReplacesSavingsRemovesEmergencyAndAddsPause() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(vault));

        assertEq(loupe.facetAddress(SavingsFacet.deposit.selector), address(savingsFacet));
        assertEq(loupe.facetAddress(EmergencyFacet.emergencyWithdraw.selector), address(0));
        assertEq(loupe.facetAddress(PauseFacet.pause.selector), address(pauseFacet));
        assertEq(loupe.facetAddress(PauseFacet.unpause.selector), address(pauseFacet));
        assertEq(loupe.facetAddress(PauseFacet.paused.selector), address(pauseFacet));
        assertFalse(pauseFacet.paused());
    }

    function testOwnerCanPauseAndUnpauseDepositsAndWithdrawals() public {
        vm.deal(USER, 2 ether);
        vm.prank(USER);
        SavingsFacet(address(vault)).deposit{value: 1 ether}(60);
        vm.warp(block.timestamp + 61);

        PauseFacet(address(vault)).pause();
        assertTrue(PauseFacet(address(vault)).paused());

        vm.expectRevert(VaultBase.Paused.selector);
        vm.prank(USER);
        SavingsFacet(address(vault)).withdraw();

        vm.expectRevert(VaultBase.Paused.selector);
        vm.prank(USER);
        SavingsFacet(address(vault)).deposit{value: 1 ether}(60);

        (uint256 saved, ) = SavingsFacet(address(vault)).savings(USER);
        assertEq(saved, 1 ether);

        PauseFacet(address(vault)).unpause();
        assertFalse(PauseFacet(address(vault)).paused());

        vm.prank(USER);
        SavingsFacet(address(vault)).withdraw();
        assertEq(SavingsFacet(address(vault)).totalSaved(), 0);
    }

    function testNonOwnerCannotPause() public {
        vm.expectRevert();
        vm.prank(USER);
        PauseFacet(address(vault)).pause();
    }

    function _upgradeToPauseFacet() private {
        pauseFacet = new PauseFacet();
        SavingsFacet replacementSavingsFacet = new SavingsFacet();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](3);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(replacementSavingsFacet),
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

        IDiamondCut(address(vault)).diamondCut(cut, address(0), "");
        savingsFacet = replacementSavingsFacet;
    }
}
