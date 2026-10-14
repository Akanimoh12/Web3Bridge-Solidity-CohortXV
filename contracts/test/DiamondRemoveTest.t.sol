// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs, FunctionNotFound} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultHelperFacet} from "../src/diamond/facets/VaultHelperFacet.sol";
import {
    CannotRemoveFunctionThatDoesNotExist,
    RemoveFacetAddressMustBeZeroAddress,
    NoSelectorsProvidedForFacetForCut,
    NotContractOwner
} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract DiamondRemoveTest is Test {
    address public owner;
    address public alice;
    address public bob;

    address public diamondAddress;
    VaultHelperFacet public helperFacet;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);

        // 1. Deploy original facets
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        SavingsFacet savingsFacet = new SavingsFacet();
        VaultInit vaultInit = new VaultInit();

        // 2. Prepare original cuts
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
            facetAddress: address(savingsFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.savings()
        });

        // 3. Deploy Diamond proxy
        DiamondArgs memory args = DiamondArgs({
            owner: owner,
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, uint256(60))
        });
        Diamond diamond = new Diamond(initialCut, args);
        diamondAddress = address(diamond);

        // 4. Deploy and ADD VaultHelperFacet
        helperFacet = new VaultHelperFacet();
        IDiamond.FacetCut[] memory addCut = new IDiamond.FacetCut[](1);
        addCut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });
        IDiamondCut(diamondAddress).diamondCut(addCut, address(0), "");

        // 5. Alice deposits 3 ETH to establish vault state and funds
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 3 ether}(100);
    }

    // --- POSITIVE TESTS ---

    function test_Remove_Success_RemovesSingleSelectorAndPreservesState() public {
        bytes4 selectorToRemove = VaultHelperFacet.isLockActive.selector;

        // Verify selector currently exists and works
        assertEq(IDiamondLoupe(diamondAddress).facetAddress(selectorToRemove), address(helperFacet));
        assertTrue(VaultHelperFacet(diamondAddress).isLockActive(alice));

        // Prepare REMOVE cut: facetAddress MUST be address(0)
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = selectorToRemove;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        // Execute REMOVE as owner
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");

        // 1. Verify loupe returns address(0) for removed selector
        assertEq(IDiamondLoupe(diamondAddress).facetAddress(selectorToRemove), address(0));

        // 2. Verify calling removed function on Diamond proxy reverts
        vm.expectRevert(abi.encodeWithSelector(FunctionNotFound.selector, selectorToRemove));
        VaultHelperFacet(diamondAddress).isLockActive(alice);

        // 3. Verify other selectors in the same facet still work completely
        assertEq(VaultHelperFacet(diamondAddress).vaultBalance(), 3 ether);
        assertEq(VaultHelperFacet(diamondAddress).remainingLockTime(alice), 100);

        // 4. Verify core SavingsFacet functions and vault storage remain 100% intact
        (uint256 savedAmount, uint64 unlockTime) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(savedAmount, 3 ether);
        assertEq(unlockTime, block.timestamp + 100);
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 3 ether);

        // 5. Verify Alice can still withdraw her funds after unlock
        vm.warp(block.timestamp + 101);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        SavingsFacet(diamondAddress).withdraw();
        assertEq(alice.balance, balBefore + 3 ether);
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 0);
    }

    function test_Remove_Success_RemovesAllFacetSelectors() public {
        bytes4[] memory allHelperSelectors = VaultSelectors.vaultHelper();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: allHelperSelectors
        });

        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");

        // Verify all 3 selectors are gone from loupe
        for (uint256 i = 0; i < allHelperSelectors.length; i++) {
            assertEq(IDiamondLoupe(diamondAddress).facetAddress(allHelperSelectors[i]), address(0));
        }

        // Verify calls to each revert
        vm.expectRevert(
            abi.encodeWithSelector(FunctionNotFound.selector, VaultHelperFacet.vaultBalance.selector)
        );
        VaultHelperFacet(diamondAddress).vaultBalance();

        vm.expectRevert(
            abi.encodeWithSelector(FunctionNotFound.selector, VaultHelperFacet.remainingLockTime.selector)
        );
        VaultHelperFacet(diamondAddress).remainingLockTime(alice);

        vm.expectRevert(
            abi.encodeWithSelector(FunctionNotFound.selector, VaultHelperFacet.isLockActive.selector)
        );
        VaultHelperFacet(diamondAddress).isLockActive(alice);

        // Verify savings facet still operational
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 3 ether);
    }

    // --- NEGATIVE / REVERT TESTS ---

    function test_Remove_Revert_NonExistentSelector() public {
        bytes4 bogusSelector = bytes4(0xdeadbeef);

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bogusSelector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotRemoveFunctionThatDoesNotExist.selector,
                bogusSelector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Remove_Revert_NonZeroFacetAddress() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = VaultHelperFacet.isLockActive.selector;

        // EIP-2535 requires facetAddress to be address(0) for Remove action
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet), // INVALID: non-zero address!
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                RemoveFacetAddressMustBeZeroAddress.selector,
                address(helperFacet)
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Remove_Revert_UnauthorizedCaller() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = VaultHelperFacet.isLockActive.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        // Bob (non-owner) attempts to remove selector
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                NotContractOwner.selector,
                bob,
                owner
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Remove_Revert_EmptySelectors() public {
        bytes4[] memory empty = new bytes4[](0);

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: empty
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                NoSelectorsProvidedForFacetForCut.selector,
                address(0)
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Remove_Revert_DuplicateRemovalInSameCut() public {
        bytes4 selector = VaultHelperFacet.isLockActive.selector;

        // Listing same selector twice in the same remove cut
        bytes4[] memory duplicate = new bytes4[](2);
        duplicate[0] = selector;
        duplicate[1] = selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: duplicate
        });

        // Second removal will revert because it was already removed in the first step
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotRemoveFunctionThatDoesNotExist.selector,
                selector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }
}
