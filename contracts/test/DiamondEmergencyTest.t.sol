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
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultBase} from "../src/diamond/VaultBase.sol";

contract RejectingReceiver {
    // Rejects incoming ETH transfers
    receive() external payable {
        revert("RejectingReceiver: reject ETH");
    }
}

contract ReentrantAttacker {
    address public diamond;
    bool public attacked;
    bool public reentrancyFailed;

    constructor(address _diamond) {
        diamond = _diamond;
    }

    function deposit(uint256 lockDuration) external payable {
        SavingsFacet(diamond).deposit{value: msg.value}(lockDuration);
    }

    function attack(uint256 amount) external {
        EmergencyFacet(diamond).emergencyWithdraw(amount);
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Attempt reentrancy into emergencyWithdraw
            (bool ok, ) = diamond.call(
                abi.encodeWithSelector(EmergencyFacet.emergencyWithdraw.selector, 0.5 ether)
            );
            // ok must be false because nonReentrant blocked it
            reentrancyFailed = !ok;
        }
    }
}

contract DiamondEmergencyTest is Test {
    address public owner;
    address public alice;
    address public bob;

    address public diamondAddress;
    EmergencyFacet public emergencyFacet;

    event EmergencyWithdraw(
        address indexed depositor,
        address indexed owner,
        uint256 requestedAmount,
        uint256 fee,
        uint256 netAmount
    );

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

        // 4. Deploy EmergencyFacet and integrate via ADD
        emergencyFacet = new EmergencyFacet();
        IDiamond.FacetCut[] memory emergencyCut = new IDiamond.FacetCut[](1);
        emergencyCut[0] = IDiamond.FacetCut({
            facetAddress: address(emergencyFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: VaultSelectors.emergency()
        });

        vm.prank(owner);
        IDiamondCut(diamondAddress).diamondCut(emergencyCut, address(0), "");
    }

    // --- POSITIVE TESTS ---

    function test_EmergencyWithdraw_Success_FeeSplitAndEarlyWithdrawal() public {
        // Alice deposits 1.0 ETH with a 1,000 second lock
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(1000);

        // Verify funds are currently locked
        (uint256 savedBefore, uint64 unlockTime) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(savedBefore, 1 ether);
        assertTrue(block.timestamp < unlockTime, "Must be under active lock");

        uint256 ownerBalBefore = owner.balance;
        uint256 aliceBalBefore = alice.balance;

        // Alice requests emergency withdrawal of 0.5 ETH
        // Expected split: Owner receives 0.05 ETH (10%), Alice receives 0.45 ETH (90%)
        vm.prank(alice);
        EmergencyFacet(diamondAddress).emergencyWithdraw(0.5 ether);

        // Verify balances
        assertEq(owner.balance, ownerBalBefore + 0.05 ether, "Owner receives 10% fee");
        assertEq(alice.balance, aliceBalBefore + 0.45 ether, "Alice receives 90% net");

        // Verify accounting
        (uint256 savedAfter, uint64 unlockAfter) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(savedAfter, 0.5 ether, "User savings decremented by full requested amount");
        assertEq(unlockAfter, unlockTime, "Unlock time preserved for remaining balance");
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 0.5 ether, "totalSaved decremented");
        assertEq(address(diamondAddress).balance, 0.5 ether, "Diamond proxy balance updated");
    }

    function test_EmergencyWithdraw_Success_FullWithdrawalClearsLock() public {
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 2 ether}(500);

        uint256 ownerBalBefore = owner.balance;
        uint256 aliceBalBefore = alice.balance;

        // Alice withdraws the full 2 ETH
        vm.prank(alice);
        EmergencyFacet(diamondAddress).emergencyWithdraw(2 ether);

        assertEq(owner.balance, ownerBalBefore + 0.2 ether, "Owner receives 0.2 ETH (10%)");
        assertEq(alice.balance, aliceBalBefore + 1.8 ether, "Alice receives 1.8 ETH (90%)");

        // Full withdrawal clears amount and unlock time
        (uint256 savedAfter, uint64 unlockAfter) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(savedAfter, 0, "Savings amount is 0");
        assertEq(unlockAfter, 0, "Unlock time reset to 0");
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 0, "totalSaved is 0");
    }

    function test_EmergencyWithdraw_Success_FeeGoesToNewOwnerAfterTransfer() public {
        address newOwner = makeAddr("newOwner");
        vm.deal(newOwner, 1 ether);

        // Transfer Diamond ownership to newOwner
        vm.prank(owner);
        OwnershipFacet(diamondAddress).transferOwnership(newOwner);

        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(100);

        uint256 newOwnerBalBefore = newOwner.balance;
        uint256 oldOwnerBalBefore = owner.balance;

        // Alice emergency withdraws
        vm.prank(alice);
        EmergencyFacet(diamondAddress).emergencyWithdraw(1 ether);

        // Fee must be sent to newOwner, not old owner
        assertEq(newOwner.balance, newOwnerBalBefore + 0.1 ether, "New owner receives fee");
        assertEq(owner.balance, oldOwnerBalBefore, "Old owner receives nothing");
    }

    function test_EmergencyWithdraw_EmitsEvent() public {
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(100);

        vm.expectEmit(true, true, false, true, diamondAddress);
        emit EmergencyWithdraw(alice, owner, 1 ether, 0.1 ether, 0.9 ether);

        vm.prank(alice);
        EmergencyFacet(diamondAddress).emergencyWithdraw(1 ether);
    }

    function test_EmergencyFeePercent_Returns10() public view {
        assertEq(EmergencyFacet(diamondAddress).emergencyFeePercent(), 10);
    }

    // --- NEGATIVE / REVERT TESTS ---

    function test_EmergencyWithdraw_Revert_ZeroAmount() public {
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(100);

        vm.prank(alice);
        vm.expectRevert(EmergencyFacet.ZeroAmount.selector);
        EmergencyFacet(diamondAddress).emergencyWithdraw(0);
    }

    function test_EmergencyWithdraw_Revert_NothingSaved() public {
        // Bob has 0 recorded savings
        vm.prank(bob);
        vm.expectRevert(VaultBase.NothingSaved.selector);
        EmergencyFacet(diamondAddress).emergencyWithdraw(0.5 ether);
    }

    function test_EmergencyWithdraw_Revert_InsufficientSavings() public {
        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(100);

        // Alice tries to withdraw 1.5 ETH from 1.0 ETH deposit
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                EmergencyFacet.InsufficientSavings.selector,
                1 ether,
                1.5 ether
            )
        );
        EmergencyFacet(diamondAddress).emergencyWithdraw(1.5 ether);
    }

    function test_EmergencyWithdraw_Revert_FailedFeeTransfer() public {
        // Ownership transferred to a rejecting receiver
        RejectingReceiver rejector = new RejectingReceiver();
        vm.prank(owner);
        OwnershipFacet(diamondAddress).transferOwnership(address(rejector));

        vm.prank(alice);
        SavingsFacet(diamondAddress).deposit{value: 1 ether}(100);

        // Transfer to owner will fail -> entire transaction must revert with TransferFailed
        vm.prank(alice);
        vm.expectRevert(VaultBase.TransferFailed.selector);
        EmergencyFacet(diamondAddress).emergencyWithdraw(1 ether);

        // State remains completely intact (atomic rollback)
        (uint256 saved, ) = SavingsFacet(diamondAddress).savings(alice);
        assertEq(saved, 1 ether);
        assertEq(SavingsFacet(diamondAddress).totalSaved(), 1 ether);
    }

    function test_EmergencyWithdraw_Revert_ReentrantCall() public {
        ReentrantAttacker attacker = new ReentrantAttacker(diamondAddress);

        // Attacker deposits 1 ETH with 100s lock
        attacker.deposit{value: 1 ether}(100);
        assertEq(address(attacker).balance, 0, "Attacker balance before withdrawal should be 0");

        // When attacker attempts emergency withdraw of 0.5 ETH, receive() tries to re-enter
        attacker.attack(0.5 ether);

        // Verify that the inner reentrant call was blocked by nonReentrant
        assertTrue(attacker.reentrancyFailed(), "Reentrancy attempt was blocked by nonReentrant");

        // Attacker receives only 0.45 ETH (single 90% payout for 0.5 ETH), not double payout
        assertEq(address(attacker).balance, 0.45 ether, "Attacker received only legitimate single payout");
        (uint256 saved, ) = SavingsFacet(diamondAddress).savings(address(attacker));
        assertEq(saved, 0.5 ether, "Vault storage decremented by only 0.5 ETH");
    }
}
