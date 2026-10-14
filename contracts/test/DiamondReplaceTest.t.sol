// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {SavingsFacetV2} from "../src/diamond/facets/SavingsFacetV2.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {
    CannotReplaceFunctionThatDoesNotExists,
    CannotReplaceFunctionsFromFacetWithZeroAddress,
    CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet,
    NotContractOwner,
    NoBytecodeAtAddress,
    NoSelectorsProvidedForFacetForCut
} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract DiamondReplaceTest is Test {
    address public owner;
    address public alice;
    address public bob;

    address public diamondAddress;
    SavingsFacet public savingsFacet;
    SavingsFacetV2 public savingsFacetV2;

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
        savingsFacet = new SavingsFacet();
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

        // 4. Deploy SavingsFacetV2
        savingsFacetV2 = new SavingsFacetV2();

        // 5. Alice deposits 5 ETH with 200s lock to create pre-upgrade vault state
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 5 ether}(200);
    }

    // --- POSITIVE TESTS ---

    function test_Replace_Success_ReplacesSelectorAndPreservesStorage() public {
        bytes4 versionSelector = SavingsFacet.version.selector;

        // 1. Pre-upgrade verification: version() routes to original savingsFacet and returns "1.0.0"
        assertEq(
            IDiamondLoupe(diamondAddress).facetAddress(versionSelector),
            address(savingsFacet),
            "version() should initially route to savingsFacet"
        );
        assertEq(
            SavingsFacet(diamondAddress).version(),
            "1.0.0",
            "Initial version should be 1.0.0"
        );

        // 2. Prepare REPLACE cut: redirect version() selector to savingsFacetV2
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = versionSelector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        // 3. Execute REPLACE cut as owner
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");

        // 4. Post-upgrade verification: loupe confirms routing to savingsFacetV2
        assertEq(
            IDiamondLoupe(diamondAddress).facetAddress(versionSelector),
            address(savingsFacetV2),
            "version() should now route to savingsFacetV2"
        );

        // 5. Calling version() through the Diamond proxy returns "2.0.0"
        assertEq(
            SavingsFacet(diamondAddress).version(),
            "2.0.0",
            "Upgraded version should return 2.0.0"
        );

        // 6. Verify existing vault storage and state remain 100% intact
        assertEq(
            SavingsFacet(diamondAddress).totalSaved(),
            5 ether,
            "totalSaved must be preserved"
        );
        assertEq(
            address(diamondAddress).balance,
            5 ether,
            "ETH balance in Diamond proxy must be preserved"
        );
        (uint256 savedAmount, uint64 unlockTime) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(savedAmount, 5 ether, "Alice saved amount must be preserved");
        assertEq(unlockTime, block.timestamp + 200, "Alice unlockTime must be preserved");
        assertEq(SavingsFacet(diamondAddress).minLockDuration(), 60, "minLockDuration must be preserved");

        // 7. Verify Alice can still withdraw funds after lock expires
        vm.warp(block.timestamp + 201);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        SavingsFacet(diamondAddress).withdraw();
        assertEq(alice.balance, balBefore + 5 ether, "Alice receives full withdrawal");
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 0);
    }

    // --- NEGATIVE / REVERT TESTS ---

    function test_Replace_Revert_NonExistentSelector() public {
        bytes4 nonExistentSelector = bytes4(0xdeadbeef);

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = nonExistentSelector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionThatDoesNotExists.selector,
                nonExistentSelector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Replace_Revert_ZeroAddressFacet() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = SavingsFacet.version.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(0),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionsFromFacetWithZeroAddress.selector,
                selectors
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Replace_Revert_SameFacet() public {
        // version() currently points to savingsFacet. Attempting to replace it with savingsFacet reverts.
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = SavingsFacet.version.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacet), // SAME FACET!
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet.selector,
                SavingsFacet.version.selector
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Replace_Revert_UnauthorizedCaller() public {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = SavingsFacet.version.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        // Bob (non-owner) attempts to replace selector
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

    function test_Replace_Revert_NoCodeAddress() public {
        address emptyAddress = address(0xbeef);

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = SavingsFacet.version.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: emptyAddress,
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                NoBytecodeAtAddress.selector,
                emptyAddress,
                "LibDiamondCut: Replace facet has no code"
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }

    function test_Replace_Revert_EmptySelectors() public {
        bytes4[] memory empty = new bytes4[](0);

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: address(savingsFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: empty
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                NoSelectorsProvidedForFacetForCut.selector,
                address(savingsFacetV2)
            )
        );
        IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
    }
}
