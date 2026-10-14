// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "../lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "../lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "../lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "../lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {EmergencyFacetV2} from "../src/diamond/facets/EmergencyFacetV2.sol";

contract EmergencyUpgradeTest is Test {
    address diamond;
    address constant USER = address(0xBEEF);
    bytes4 selector = EmergencyFacet.emergencyWithdraw.selector;

    receive() external payable {}

    function setUp() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

        cuts[0] =
            IDiamond.FacetCut(address(new DiamondCutFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.diamondCut());

        cuts[1] = IDiamond.FacetCut(
            address(new DiamondLoupeFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.diamondLoupe()
        );

        cuts[2] = IDiamond.FacetCut(address(new SavingsFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.savings());

        VaultInit init = new VaultInit();

        diamond = address(
            new Diamond(
                cuts, DiamondArgs(address(this), address(init), abi.encodeWithSelector(VaultInit.init.selector, 60))
            )
        );

        vm.deal(USER, 2 ether);

        vm.prank(USER);
        SavingsFacet(diamond).deposit{value: 1 ether}(86400);
    }

    function cut(address facet, IDiamond.FacetCutAction action) internal {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut(facet, action, selectors);

        IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    }

    function testAddReplaceRemoveRestore() public {
        assertEq(IDiamondLoupe(diamond).facetAddress(selector), address(0));

        EmergencyFacet v1 = new EmergencyFacet();
        cut(address(v1), IDiamond.FacetCutAction.Add);
        assertEq(IDiamondLoupe(diamond).facetAddress(selector), address(v1));

        EmergencyFacetV2 v2 = new EmergencyFacetV2();
        cut(address(v2), IDiamond.FacetCutAction.Replace);
        assertEq(IDiamondLoupe(diamond).facetAddress(selector), address(v2));

        cut(address(0), IDiamond.FacetCutAction.Remove);
        assertEq(IDiamondLoupe(diamond).facetAddress(selector), address(0));

        cut(address(v2), IDiamond.FacetCutAction.Add);
        assertEq(IDiamondLoupe(diamond).facetAddress(selector), address(v2));
    }

    function testEmergencyFeeAndStorage() public {
        EmergencyFacetV2 v2 = new EmergencyFacetV2();
        cut(address(v2), IDiamond.FacetCutAction.Add);

        uint256 userBefore = USER.balance;
        uint256 ownerBefore = address(this).balance;

        vm.prank(USER);
        EmergencyFacetV2(diamond).emergencyWithdraw(0.4 ether);

        assertEq(USER.balance - userBefore, 0.36 ether);
        assertEq(address(this).balance - ownerBefore, 0.04 ether);

        (uint256 remaining,) = SavingsFacet(diamond).savings(USER);
        assertEq(remaining, 0.6 ether);
        assertEq(SavingsFacet(diamond).totalSaved(), 0.6 ether);
        assertEq(diamond.balance, 0.6 ether);
    }

    function testRoundingAndPartialWithdrawal() public {
        EmergencyFacetV2 v2 = new EmergencyFacetV2();
        cut(address(v2), IDiamond.FacetCutAction.Add);

        uint256 ownerBefore = address(this).balance;
        uint256 userBefore = USER.balance;

        vm.prank(USER);
        EmergencyFacetV2(diamond).emergencyWithdraw(11);

        assertEq(USER.balance - userBefore, 9);
        assertEq(address(this).balance - ownerBefore, 2);

        (uint256 remaining,) = SavingsFacet(diamond).savings(USER);
        assertEq(remaining, 1 ether - 11);
    }

    function testUnauthorizedUpgradeReverts() public {
        EmergencyFacet v1 = new EmergencyFacet();

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut(address(v1), IDiamond.FacetCutAction.Add, selectors);

        vm.prank(USER);
        vm.expectRevert();
        IDiamondCut(diamond).diamondCut(cuts, address(0), "");
    }
}
