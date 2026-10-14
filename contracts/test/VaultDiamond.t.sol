//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Diamond, DiamondArgs, FunctionNotFound} from "lib/diamond-1-hardhat/contracts/Diamond.sol";
import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {DiamondCutFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "lib/diamond-1-hardhat/contracts/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "lib/diamond-1-hardhat/contracts/facets/OwnershipFacet.sol";
import {
    NotContractOwner,
    CannotAddFunctionToDiamondThatAlreadyExists,
    CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet,
    CannotReplaceFunctionThatDoesNotExists,
    CannotRemoveFunctionThatDoesNotExist,
    RemoveFacetAddressMustBeZeroAddress,
    NoBytecodeAtAddress
} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultBase} from "../src/diamond/VaultBase.sol";
import {SavingsFacet} from "../src/diamond/facets/SavingsFacet.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";

contract WithdrawalReceiver {
    SavingsFacet internal savings;
    EmergencyFacet internal emergency;
    bool internal reject;
    bool internal attack;
    bool public normalReentry;
    bool public emergencyReentry;
    bytes4 public normalError;
    bytes4 public emergencyError;

    constructor(address vault) {
        savings = SavingsFacet(vault);
        emergency = EmergencyFacet(vault);
    }

    function deposit() external payable {
        savings.deposit{value: msg.value}(60);
    }

    function withdraw(bool emergencyMode, bool rejectTransfer, bool attemptReentry) external {
        reject = rejectTransfer;
        attack = attemptReentry;
        if (emergencyMode) emergency.emergencyWithdraw();
        else savings.withdraw();
    }

    receive() external payable {
        require(!reject, "Rejected");
        if (attack) {
            (bool normalOk, bytes memory normalData) = address(savings).call(abi.encodeCall(SavingsFacet.withdraw, ()));
            (bool emergencyOk, bytes memory emergencyData) =
                address(emergency).call(abi.encodeCall(EmergencyFacet.emergencyWithdraw, ()));
            normalReentry = normalOk;
            emergencyReentry = emergencyOk;
            normalError = bytes4(normalData);
            emergencyError = bytes4(emergencyData);
        }
    }
}

contract RevertingInit {
    function init() external pure {
        revert("Init failed");
    }
}

contract VaultDiamondTest is Test {
    address internal vault;
    address internal savingsImpl;
    address internal emergencyImpl;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    SavingsFacet internal savings;
    EmergencyFacet internal emergency;
    IDiamondCut internal cutter;
    IDiamondLoupe internal loupe;

    function setUp() public {
        savingsImpl = address(new SavingsFacet());
        emergencyImpl = address(new EmergencyFacet());
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](5);
        cut[0] =
            IDiamond.FacetCut(address(new DiamondCutFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.diamondCut());
        cut[1] = IDiamond.FacetCut(
            address(new DiamondLoupeFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.diamondLoupe()
        );
        cut[2] =
            IDiamond.FacetCut(address(new OwnershipFacet()), IDiamond.FacetCutAction.Add, VaultSelectors.ownership());
        cut[3] = IDiamond.FacetCut(savingsImpl, IDiamond.FacetCutAction.Add, VaultSelectors.savings());
        cut[4] = IDiamond.FacetCut(emergencyImpl, IDiamond.FacetCutAction.Add, VaultSelectors.emergency());
        vault = address(
            new Diamond(cut, DiamondArgs(address(this), address(new VaultInit()), abi.encodeCall(VaultInit.init, (60))))
        );
        savings = SavingsFacet(vault);
        emergency = EmergencyFacet(vault);
        cutter = IDiamondCut(vault);
        loupe = IDiamondLoupe(vault);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function _deposit(address user, uint256 amount) internal {
        vm.prank(user);
        savings.deposit{value: amount}(60);
    }

    function _one(bytes4 selector) internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = selector;
    }

    function _cut(address facet, IDiamond.FacetCutAction action, bytes4[] memory selectors) internal {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut(facet, action, selectors);
        cutter.diamondCut(cut, address(0), "");
    }

    function testSelectorsInstalled() public view {
        assertEq(abi.encode(loupe.facetFunctionSelectors(emergencyImpl)), abi.encode(VaultSelectors.emergency()));
        assertEq(abi.encode(loupe.facetFunctionSelectors(savingsImpl)), abi.encode(VaultSelectors.savings()));
        assertEq(loupe.facetAddresses().length, 5);
        assertFalse(emergency.paused());
    }

    function testPauseOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, alice, address(this)));
        emergency.pause();
        emergency.pause();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, alice, address(this)));
        emergency.unpause();
    }

    function testPauseBlocksDepositsAndUnpauseRestoresThem() public {
        emergency.pause();
        vm.prank(alice);
        vm.expectRevert(VaultBase.VaultPaused.selector);
        savings.deposit{value: 1 ether}(60);
        assertEq(savings.totalSaved(), 0);
        emergency.unpause();
        _deposit(alice, 1 ether);
        assertEq(savings.totalSaved(), 1 ether);
    }

    function testPauseTransitions() public {
        vm.expectRevert(VaultBase.VaultNotPaused.selector);
        emergency.unpause();
        emergency.pause();
        vm.expectRevert(VaultBase.VaultPaused.selector);
        emergency.pause();
    }

    function testNormalWithdrawalWhilePausedHonorsLock() public {
        _deposit(alice, 1 ether);
        emergency.pause();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SavingsFacet.StillLocked.selector, block.timestamp + 60));
        savings.withdraw();
        vm.warp(block.timestamp + 60);
        vm.prank(alice);
        savings.withdraw();
        assertEq(alice.balance, 10 ether);
        assertEq(savings.totalSaved(), 0);
    }

    function testEmergencyWithdrawalRequiresPause() public {
        _deposit(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(VaultBase.VaultNotPaused.selector);
        emergency.emergencyWithdraw();
    }

    function testEmergencyWithdrawalOnlyOwnFundsAndClearsAccounting() public {
        _deposit(alice, 1 ether);
        _deposit(bob, 2 ether);
        emergency.pause();
        vm.prank(alice);
        emergency.emergencyWithdraw();
        (uint256 amount, uint64 unlock) = savings.savings(alice);
        assertEq(amount, 0);
        assertEq(unlock, 0);
        assertEq(alice.balance, 10 ether);
        assertEq(savings.totalSaved(), 2 ether);
        assertEq(vault.balance, 2 ether);
        (amount,) = savings.savings(bob);
        assertEq(amount, 2 ether);
        vm.prank(alice);
        vm.expectRevert(VaultBase.NothingSaved.selector);
        emergency.emergencyWithdraw();
    }

    function testRejectedEmergencyTransferRestoresSavings() public {
        WithdrawalReceiver receiver = new WithdrawalReceiver(vault);
        vm.deal(address(this), 1 ether);
        receiver.deposit{value: 1 ether}();
        emergency.pause();
        vm.expectRevert(VaultBase.TransferFailed.selector);
        receiver.withdraw(true, true, false);
        (uint256 amount, uint64 unlock) = savings.savings(address(receiver));
        assertEq(amount, 1 ether);
        assertEq(unlock, block.timestamp + 60);
        assertEq(savings.totalSaved(), 1 ether);
        receiver.withdraw(true, false, false);
        assertEq(savings.totalSaved(), 0);
    }

    function testSharedReentrancyGuardAcrossWithdrawals() public {
        WithdrawalReceiver receiver = new WithdrawalReceiver(vault);
        vm.deal(address(this), 2 ether);
        receiver.deposit{value: 1 ether}();
        emergency.pause();
        receiver.withdraw(true, false, true);
        assertFalse(receiver.normalReentry());
        assertFalse(receiver.emergencyReentry());
        assertEq(receiver.normalError(), VaultBase.ReentrantCall.selector);
        assertEq(receiver.emergencyError(), VaultBase.ReentrantCall.selector);
        emergency.unpause();
        receiver.deposit{value: 1 ether}();
        emergency.pause();
        vm.warp(block.timestamp + 60);
        receiver.withdraw(false, false, true);
        assertFalse(receiver.normalReentry());
        assertFalse(receiver.emergencyReentry());
        assertEq(receiver.normalError(), VaultBase.ReentrantCall.selector);
        assertEq(receiver.emergencyError(), VaultBase.ReentrantCall.selector);
        assertEq(address(receiver).balance, 2 ether);
        assertEq(savings.totalSaved(), 0);
    }

    function testReplaceSavingsPreservesStorageAndPause() public {
        _deposit(alice, 1 ether);
        emergency.pause();
        address replacement = address(new SavingsFacet());
        _cut(replacement, IDiamond.FacetCutAction.Replace, VaultSelectors.savings());
        (uint256 amount, uint64 unlock) = savings.savings(alice);
        assertEq(amount, 1 ether);
        assertEq(unlock, block.timestamp + 60);
        assertEq(savings.totalSaved(), 1 ether);
        assertEq(savings.minLockDuration(), 60);
        assertEq(savings.version(), "1.0.0");
        assertTrue(emergency.paused());
        assertEq(loupe.facetAddress(SavingsFacet.withdraw.selector), replacement);
        assertEq(loupe.facetFunctionSelectors(savingsImpl).length, 0);
        vm.prank(alice);
        emergency.emergencyWithdraw();
    }

    function testRemoveAndAddEmergencyPreservesState() public {
        emergency.pause();
        _cut(address(0), IDiamond.FacetCutAction.Remove, VaultSelectors.emergency());
        assertEq(loupe.facetAddress(EmergencyFacet.pause.selector), address(0));
        assertEq(loupe.facetAddresses().length, 4);
        vm.expectRevert(abi.encodeWithSelector(FunctionNotFound.selector, EmergencyFacet.paused.selector));
        emergency.paused();
        address replacement = address(new EmergencyFacet());
        _cut(replacement, IDiamond.FacetCutAction.Add, VaultSelectors.emergency());
        assertTrue(emergency.paused());
        assertEq(abi.encode(loupe.facetFunctionSelectors(replacement)), abi.encode(VaultSelectors.emergency()));
        emergency.unpause();
    }

    function testAllCutActionsOnlyOwner() public {
        address replacement = address(new SavingsFacet());
        for (uint256 action; action < 3; action++) {
            IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
            cut[0] = IDiamond.FacetCut(
                action == 2 ? address(0) : replacement,
                IDiamond.FacetCutAction(action),
                _one(SavingsFacet.version.selector)
            );
            vm.prank(alice);
            vm.expectRevert(abi.encodeWithSelector(NotContractOwner.selector, alice, address(this)));
            cutter.diamondCut(cut, address(0), "");
        }
    }

    function testDuplicateAddReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(CannotAddFunctionToDiamondThatAlreadyExists.selector, SavingsFacet.version.selector)
        );
        _cut(savingsImpl, IDiamond.FacetCutAction.Add, _one(SavingsFacet.version.selector));
    }

    function testReplaceSameFacetReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet.selector, SavingsFacet.version.selector
            )
        );
        _cut(savingsImpl, IDiamond.FacetCutAction.Replace, _one(SavingsFacet.version.selector));
    }

    function testMissingSelectorsRevert() public {
        bytes4 missing = bytes4(keccak256("missing()"));
        vm.expectRevert(abi.encodeWithSelector(CannotReplaceFunctionThatDoesNotExists.selector, missing));
        _cut(savingsImpl, IDiamond.FacetCutAction.Replace, _one(missing));
        vm.expectRevert(abi.encodeWithSelector(CannotRemoveFunctionThatDoesNotExist.selector, missing));
        _cut(address(0), IDiamond.FacetCutAction.Remove, _one(missing));
    }

    function testRemoveRequiresZeroFacet() public {
        vm.expectRevert(abi.encodeWithSelector(RemoveFacetAddressMustBeZeroAddress.selector, savingsImpl));
        _cut(savingsImpl, IDiamond.FacetCutAction.Remove, _one(SavingsFacet.version.selector));
    }

    function testFacetMustHaveCode() public {
        vm.expectRevert(
            abi.encodeWithSelector(NoBytecodeAtAddress.selector, alice, "LibDiamondCut: Add facet has no code")
        );
        _cut(alice, IDiamond.FacetCutAction.Add, _one(bytes4(keccak256("missing()"))));
        vm.expectRevert(
            abi.encodeWithSelector(NoBytecodeAtAddress.selector, alice, "LibDiamondCut: Replace facet has no code")
        );
        _cut(alice, IDiamond.FacetCutAction.Replace, _one(SavingsFacet.version.selector));
    }

    function testRevertingInitializerRollsBackCut() public {
        address replacement = address(new SavingsFacet());
        RevertingInit initializer = new RevertingInit();
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut(replacement, IDiamond.FacetCutAction.Replace, VaultSelectors.savings());
        vm.expectRevert("Init failed");
        cutter.diamondCut(cut, address(initializer), abi.encodeCall(RevertingInit.init, ()));
        assertEq(loupe.facetAddress(SavingsFacet.withdraw.selector), savingsImpl);
    }
}
