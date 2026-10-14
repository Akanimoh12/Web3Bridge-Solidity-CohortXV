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
    CannotAddFunctionToDiamondThatAlreadyExists,
    CannotAddSelectorsToZeroAddress,
    NoSelectorsProvidedForFacetForCut,
    NotContractOwner,
    NoBytecodeAtAddress
} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract DiamondAddTest is Test {
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

        // 3. Deploy Diamond proxy
        DiamondArgs memory args = DiamondArgs({
            owner: owner,
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, uint256(60))
        });
        Diamond diamond = new Diamond(cut, args);
        diamondAddress = address(diamond);

        // 4. Deploy new VaultHelperFacet
        helperFacet = new VaultHelperFacet();
    }

    // --- POSITIVE TESTS ---

    function test_Add_Success_AddsSelectorsAndRoutesCalls() public {
        // Pre-check: selectors do not exist in Diamond and proxy call reverts
        bytes4 selector = VaultHelperFacet.vaultBalance.selector;
        assertEq(IDiamondLoupe(diamondAddress).facetAddress(selector), address(0));
        vm.expectRevert(abi.encodeWithSelector(FunctionNotFound.selector, selector));
        VaultHelperFacet(diamondAddress).vaultBalance();

        // Prepare ADD cut
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        // Execute diamondCut as owner
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");

        // Loupe check: all 3 selectors point to helperFacet
        bytes4[] memory helperSelectors = VaultSelectors.vaultHelper();
        for (uint256 i = 0; i < helperSelectors.length; i++) {
            assertEq(
                IDiamondLoupe(diamondAddress).facetAddress(helperSelectors[i]),
                address(helperFacet),
                "Selector should be mapped to helperFacet"
            );
        }

        // Verify functionality through Diamond proxy
        VaultHelperFacet diamondHelper = VaultHelperFacet(diamondAddress);
        assertEq(diamondHelper.vaultBalance(), 0);

        // Alice deposits 2 ether with 120 seconds lock
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 2 ether}(120);

        // Check new view functions through Diamond proxy
        assertEq(diamondHelper.vaultBalance(), 2 ether);
        assertTrue(diamondHelper.isLockActive(alice));
        assertEq(diamondHelper.remainingLockTime(alice), 120);

        // Warp time by 40 seconds
        vm.warp(block.timestamp + 40);
        assertEq(diamondHelper.remainingLockTime(alice), 80);
        assertTrue(diamondHelper.isLockActive(alice));

        // Warp time past unlock (81 seconds later)
        vm.warp(block.timestamp + 81);
        assertEq(diamondHelper.remainingLockTime(alice), 0);
        assertFalse(diamondHelper.isLockActive(alice));
    }

    // --- NEGATIVE / REVERT TESTS ---

    function test_Add_Revert_DuplicateSelector() public {
        // Prepare ADD cut with selector that already belongs to SavingsFacet
        bytes4[] memory duplicate = new bytes4[](1);
        duplicate[0] = SavingsFacet.deposit.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: duplicate
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddFunctionToDiamondThatAlreadyExists.selector,
                SavingsFacet.deposit.selector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Add_Revert_ZeroAddressFacet() public {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotAddSelectorsToZeroAddress.selector,
                VaultSelectors.vaultHelper()
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Add_Revert_NoCodeAddress() public {
        address emptyAddress = address(0xdead);

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: emptyAddress,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                emptyAddress,
                "LibDiamondCut: Add facet has no code"
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Add_Revert_UnauthorizedCaller() public {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.vaultHelper()
        });

        // Alice (non-owner) tries to call diamondCut
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                NotContractOwner.selector,
                alice,
                owner
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Add_Revert_EmptySelectors() public {
        bytes4[] memory empty = new bytes4[](0);

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(helperFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: empty
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                NoSelectorsProvidedForFacetForCut.selector,
                address(helperFacet)
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }
}
