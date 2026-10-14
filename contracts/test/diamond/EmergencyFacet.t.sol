// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";

import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";

import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";

import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";

import {SavingsFacet} from "../../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultSelectors} from "../../src/diamond/VaultSelectors.sol";

contract EmergencyFacetTest is Test {
    uint256 internal constant MIN_LOCK = 1 days;
    uint256 internal constant LOCK_DURATION = 7 days;
    uint256 internal constant DEPOSIT_AMOUNT = 1 ether;

    address internal constant USER = address(0xBEEF);

    Diamond internal diamond;
    SavingsFacet internal savings;
    EmergencyFacet internal emergency;
    EmergencyFacet internal emergencyImplementation;
    IDiamondLoupe internal loupe;

    // The test contract owns the Diamond and receives the penalty.
    receive() external payable {}

    function setUp() public {
        // 1. Deploy the four original facets.
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        SavingsFacet savingsFacet = new SavingsFacet();

        // 2. Register the original facets and their selectors.
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](4);

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

        // 3. Deploy the initializer.
        VaultInit vaultInit = new VaultInit();

        // 4. Configure the Diamond owner and initializer.
        // DiamondArgs is a standalone struct imported from Diamond.sol.
        DiamondArgs memory args = DiamondArgs({
            owner: address(this),
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, MIN_LOCK)
        });

        // 5. Deploy a fresh Diamond for this test.
        diamond = new Diamond(cut, args);

        // Call the Diamond through the facet interfaces.
        savings = SavingsFacet(address(diamond));
        loupe = IDiamondLoupe(address(diamond));

        // Fund the user account for deposits.
        vm.deal(USER, 10 ether);
    }

    function _depositAsUser() internal {
        vm.prank(USER);
        savings.deposit{value: DEPOSIT_AMOUNT}(LOCK_DURATION);
    }

    function _upgradeEmergencyFacet() internal {
        emergencyImplementation = new EmergencyFacet();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);

        cut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyImplementation),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        IDiamondCut(address(diamond)).diamondCut(cut, address(0), "");

        // Call the emergency function through the Diamond proxy.
        emergency = EmergencyFacet(address(diamond));
    }

    function testUserCanDepositIntoSavingsFacet() public {
        _depositAsUser();

        (uint256 amount, uint64 unlockTime) = savings.savings(USER);

        assertEq(amount, DEPOSIT_AMOUNT);
        assertEq(uint256(unlockTime), block.timestamp + LOCK_DURATION);
        assertEq(savings.totalSaved(), DEPOSIT_AMOUNT);
    }

    function testUpgradePreservesExistingSavings() public {
        _depositAsUser();

        (uint256 amountBefore, uint64 unlockBefore) = savings.savings(USER);
        uint256 totalBefore = savings.totalSaved();

        _upgradeEmergencyFacet();

        (uint256 amountAfter, uint64 unlockAfter) = savings.savings(USER);

        assertEq(amountAfter, amountBefore);
        assertEq(uint256(unlockAfter), uint256(unlockBefore));
        assertEq(savings.totalSaved(), totalBefore);
    }

    function testEmergencyWithdrawPaysUser90PercentAndOwner10Percent() public {
        _depositAsUser();
        _upgradeEmergencyFacet();

        uint256 userBalanceBefore = USER.balance;
        uint256 ownerBalanceBefore = address(this).balance;

        vm.prank(USER);
        emergency.emergencyWithdraw();

        uint256 penalty = DEPOSIT_AMOUNT * 10 / 100;
        uint256 payout = DEPOSIT_AMOUNT - penalty;

        assertEq(USER.balance, userBalanceBefore + payout);
        assertEq(address(this).balance, ownerBalanceBefore + penalty);
    }

    function testEmergencyWithdrawClearsSavingsAndTotalSaved() public {
        _depositAsUser();
        _upgradeEmergencyFacet();

        vm.prank(USER);
        emergency.emergencyWithdraw();

        (uint256 amount, uint64 unlockTime) = savings.savings(USER);

        assertEq(amount, 0);
        assertEq(uint256(unlockTime), 0);
        assertEq(savings.totalSaved(), 0);
    }

    function testEmergencyWithdrawRevertsAfterLockExpires() public {
        _depositAsUser();
        _upgradeEmergencyFacet();

        vm.warp(block.timestamp + LOCK_DURATION);

        vm.expectRevert(EmergencyFacet.NoEmergencyNeeded.selector);
        vm.prank(USER);
        emergency.emergencyWithdraw();
    }

    function testOrdinaryWithdrawWorksAfterLockExpires() public {
        _depositAsUser();

        vm.warp(block.timestamp + LOCK_DURATION);

        uint256 userBalanceBefore = USER.balance;

        vm.prank(USER);
        savings.withdraw();

        assertEq(USER.balance, userBalanceBefore + DEPOSIT_AMOUNT);

        (uint256 amount, uint64 unlockTime) = savings.savings(USER);

        assertEq(amount, 0);
        assertEq(uint256(unlockTime), 0);
        assertEq(savings.totalSaved(), 0);
    }

    function testEmergencySelectorIsRegisteredInDiamond() public {
        _upgradeEmergencyFacet();

        assertEq(loupe.facetAddress(EmergencyFacet.emergencyWithdraw.selector), address(emergencyImplementation));
    }
}
