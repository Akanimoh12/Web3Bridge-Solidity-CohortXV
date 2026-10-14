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
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultCuts} from "../src/diamond/VaultCuts.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultUpgradeInit} from "../src/diamond/upgradeInitializers/VaultUpgradeInit.sol";

contract VaultUpgradeTest is Test {
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address diamond;

    function setUp() public {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](4);
        cut[0] = VaultCuts.add(address(new DiamondCutFacet()), VaultSelectors.diamondCut());
        cut[1] = VaultCuts.add(address(new DiamondLoupeFacet()), VaultSelectors.diamondLoupe());
        cut[2] = VaultCuts.add(address(new OwnershipFacet()), VaultSelectors.ownership());
        cut[3] = VaultCuts.add(address(new SavingsFacet()), VaultSelectors.savings());

        VaultInit init = new VaultInit();
        diamond = address(new Diamond(cut, DiamondArgs({
            owner: owner,
            init: address(init),
            initCalldata: abi.encodeCall(VaultInit.init, (60))
        })));

        vm.deal(alice, 10 ether);
        vm.prank(alice);
        SavingsFacet(diamond).deposit{value: 10 ether}(1 days);
    }

    function _upgrade() internal {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = VaultCuts.add(address(new EmergencyFacet()), VaultSelectors.emergency());
        VaultUpgradeInit init = new VaultUpgradeInit();

        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(cut, address(init), abi.encodeCall(VaultUpgradeInit.setVersion, ("2.0.0")));
    }

    function test_UpgradeKeepsAddressAndState() public {
        _upgrade();
        assertEq(SavingsFacet(diamond).version(), "2.0.0");
        assertEq(SavingsFacet(diamond).totalSaved(), 10 ether);
        (uint256 amount,) = SavingsFacet(diamond).savings(alice);
        assertEq(amount, 10 ether);
    }

    function test_OnlyOwnerCanUpgrade() public {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = VaultCuts.add(address(new EmergencyFacet()), VaultSelectors.emergency());
        vm.prank(alice);
        vm.expectRevert();
        IDiamondCut(diamond).diamondCut(cut, address(0), "");
    }

    function test_EmergencyWithdrawTenPercentWhileLocked() public {
        _upgrade();
        assertEq(EmergencyFacet(diamond).emergencyAvailable(alice), 1 ether);

        vm.prank(alice);
        EmergencyFacet(diamond).emergencyWithdraw();

        assertEq(alice.balance, 1 ether);
        assertEq(diamond.balance, 9 ether);
        assertEq(SavingsFacet(diamond).totalSaved(), 9 ether);
        (uint256 amount,) = SavingsFacet(diamond).savings(alice);
        assertEq(amount, 9 ether);
        assertEq(EmergencyFacet(diamond).emergencyAvailable(alice), 0);
    }

    function test_EmergencyWithdrawOncePerLock() public {
        _upgrade();
        vm.startPrank(alice);
        EmergencyFacet(diamond).emergencyWithdraw();
        vm.expectRevert();
        EmergencyFacet(diamond).emergencyWithdraw();
        vm.stopPrank();
    }

    function test_EmergencyWithdrawRevertsAfterUnlock() public {
        _upgrade();
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        vm.expectRevert(EmergencyFacet.NotLocked.selector);
        EmergencyFacet(diamond).emergencyWithdraw();

        // normal withdraw still returns everything
        vm.prank(alice);
        SavingsFacet(diamond).withdraw();
        assertEq(alice.balance, 10 ether);
    }

    function test_ReplaceAndRemoveHelpers() public {
        _upgrade();

        // Replace: point emergency selectors at a fresh deployment
        address newEmergency = address(new EmergencyFacet());
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = VaultCuts.replace(newEmergency, VaultSelectors.emergency());
        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(cut, address(0), "");
        assertEq(IDiamondLoupe(diamond).facetAddress(EmergencyFacet.emergencyWithdraw.selector), newEmergency);

        // Remove: unroute them entirely
        cut[0] = VaultCuts.remove(VaultSelectors.emergency());
        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(cut, address(0), "");
        assertEq(IDiamondLoupe(diamond).facetAddress(EmergencyFacet.emergencyWithdraw.selector), address(0));
        vm.expectRevert();
        EmergencyFacet(diamond).emergencyWithdraw();
    }
}
