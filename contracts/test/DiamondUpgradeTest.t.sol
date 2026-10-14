// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {IERC173} from "lib/diamond-1-hardhat/contracts/interfaces/IERC173.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultHelperFacet} from "../src/diamond/facets/VaultHelperFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {SavingsFacetV2} from "../src/diamond/facets/SavingsFacetV2.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {
    NotContractOwner,
    CannotAddFunctionToDiamondThatAlreadyExists,
    CannotReplaceFunctionThatDoesNotExists
} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract DiamondUpgradeTest is Test {
    address public owner;
    address public alice;
    address public bob;

    address public diamondAddress;
    SavingsFacet public originalSavings;
    VaultHelperFacet public helperFacet;
    EmergencyFacet public emergencyFacet;
    SavingsFacetV2 public savingsV2;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.deal(owner, 10 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);

        // 1. Deploy original facets
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        originalSavings = new SavingsFacet();
        VaultInit vaultInit = new VaultInit();

        // 2. Initial cuts
        IDiamond.FacetCut[] memory initialCut = new IDiamond.FacetCut[](4);
        initialCut[0] = IDiamond.FacetCut({
            facetAddress: address(cutFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondCut()
        });
        initialCut[1] = IDiamond.FacetCut({
            facetAddress: address(loupeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.diamondLoupe()
        });
        initialCut[2] = IDiamond.FacetCut({
            facetAddress: address(ownershipFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.ownership()
        });
        initialCut[3] = IDiamond.FacetCut({
            facetAddress: address(originalSavings),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.savings()
        });

        // 3. Deploy Diamond
        DiamondArgs memory args = DiamondArgs({
            owner: owner,
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, uint256(60))
        });
        Diamond diamond = new Diamond(initialCut, args);
        diamondAddress = address(diamond);

        // 4. Pre-upgrade activity: Alice deposits 4 ETH with 300s lock
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 4 ether}(300);

        // 5. Deploy new facets for upgrade
        helperFacet = new VaultHelperFacet();
        emergencyFacet = new EmergencyFacet();
        savingsV2 = new SavingsFacetV2();
    }

    function _executeFullUpgrade() internal {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

        // Cut 0: ADD VaultHelperFacet
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        // Cut 1: ADD EmergencyFacet
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        // Cut 2: REPLACE version() with SavingsFacetV2
        bytes4[] memory replaceSelectors = new bytes4[](1);
        replaceSelectors[0] = SavingsFacetV2.version.selector;
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(savingsV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: replaceSelectors
        });

        vm.prank(owner);
        IDiamondCut(diamondAddress).diamondCut(cuts, address(0), "");
    }

    // --- POSITIVE TESTS ---

    function test_Upgrade_ProxyAddressAndStoragePreserved() public {
        address originalAddress = diamondAddress;
        assertEq(SavingsFacet(diamondAddress).version(), "1.0.0");

        // Execute full upgrade
        _executeFullUpgrade();

        // 1. Verify Diamond proxy address is 100% identical
        assertEq(diamondAddress, originalAddress, "Proxy address must not change");

        // 2. Verify version changed from "1.0.0" to "2.0.0"
        assertEq(SavingsFacet(diamondAddress).version(), "2.0.0", "version() must update to 2.0.0");

        // 3. Verify VaultHelper functions are active
        assertEq(VaultHelperFacet(diamondAddress).vaultBalance(), 4 ether);
        assertTrue(VaultHelperFacet(diamondAddress).isLockActive(alice));
        assertEq(VaultHelperFacet(diamondAddress).remainingLockTime(alice), 300);

        // 4. Verify Emergency functions are active
        assertEq(EmergencyFacet(diamondAddress).emergencyFeePercent(), 10);

        // 5. Verify Alice's pre-upgrade deposit and lock are completely preserved
        (uint256 saved, uint64 unlockTime) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(saved, 4 ether);
        assertEq(unlockTime, block.timestamp + 300);
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 4 ether);
        assertEq(SavingsFacet(diamondAddress).minLockDuration(), 60);

        // 6. Verify Diamond owner is preserved
        assertEq(IERC173(diamondAddress).owner(), owner);

        // 7. Test regular deposit after upgrade
        vm.prank(bob);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(60);
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 5 ether);

        // 8. Test emergency withdrawal on pre-upgrade deposit
        uint256 ownerBalBefore = owner.balance;
        uint256 aliceBalBefore = alice.balance;
        vm.prank(alice);
        EmergencyFacet(diamondAddress).emergencyWithdraw(1 ether);

        assertEq(owner.balance, ownerBalBefore + 0.1 ether, "Owner receives 10% fee");
        assertEq(alice.balance, aliceBalBefore + 0.9 ether, "Alice receives 90% net");
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 4 ether);

        // 9. Test standard withdrawal after lock expiry
        vm.warp(block.timestamp + 301);
        uint256 bobBalBefore = bob.balance;
        vm.prank(bob);
        SavingsFacet(diamondAddress).withdraw();
        assertEq(bob.balance, bobBalBefore + 1 ether);
    }

    function test_Upgrade_SmallAmount_ZeroFeeBranch() public {
        _executeFullUpgrade();

        // Bob deposits a tiny amount: 9 wei with 100s lock
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        SavingsFacet(diamondAddress).deposit{value: 9 wei}(100);

        uint256 ownerBalBefore = owner.balance;
        uint256 bobBalBefore = bob.balance;

        // Bob emergency withdraws 5 wei (where 5 * 10 / 100 = 0 wei fee)
        // This exercises the `fee == 0` branch in EmergencyFacet.sol line 54!
        vm.prank(bob);
        EmergencyFacet(diamondAddress).emergencyWithdraw(5 wei);

        // Owner receives 0 fee (fee == 0 branch skipped)
        assertEq(owner.balance, ownerBalBefore, "Owner receives 0 fee on < 10 wei");
        // Bob receives full 5 wei
        assertEq(bob.balance, bobBalBefore + 5 wei, "Bob receives 100% of sub-10 wei amount");

        (uint256 bobRemaining, ) = SavingsFacet(diamondAddress).savings(bob);
        assertEq(bobRemaining, 4 wei, "Bob has 4 wei remaining");
    }

    // --- REVERT / NEGATIVE TESTS ---

    function test_Upgrade_Revert_UnauthorizedCaller() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        // Bob (non-owner) attempts upgrade
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, bob, owner));
        IDiamondCut(diamondAddress).diamondCut(cuts, address(0), "");
    }

    function test_Upgrade_Revert_DuplicateSelectorInAdd() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        // Attempting to ADD SavingsFacet.deposit which already exists
        bytes4[] memory dup = new bytes4[](1);
        dup[0] = SavingsFacet.deposit.selector;

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: dup
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddFunctionToDiamondThatAlreadyExists.selector,
                SavingsFacet.deposit.selector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cuts, address(0), "");
    }

    function test_Upgrade_Revert_ReplaceNonExistentSelector() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory nonExistent = new bytes4[](1);
        nonExistent[0] = bytes4(0x12345678);

        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(savingsV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: nonExistent
        });

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionThatDoesNotExists.selector,
                bytes4(0x12345678)
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cuts, address(0), "");
    }
}
