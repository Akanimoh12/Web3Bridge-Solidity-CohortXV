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
import {SavingsFacetV2} from "../src/diamond/facets/SavingsFacetV2.sol";
import {EmergencyFacet} from "../src/diamond/facets/EmergencyFacet.sol";
import {VaultInit} from "../src/diamond/upgradeInitializers/VaultInit.sol";
import {VaultSelectors} from "../src/diamond/VaultSelectors.sol";
import {VaultBase} from "../src/diamond/VaultBase.sol";

interface IEmergencyVault {
    function deposit(uint256 lockDuration) external payable;
    function emergencyWithdraw() external;
    function savings(address user) external view returns (uint256 amount, uint64 unlockTime);
    function totalSaved() external view returns (uint256);
}

interface ISavingsVaultV2 {
    function deposit(uint256 lockDuration) external payable;
    function savings(address user) external view returns (uint256 amount, uint64 unlockTime);
    function totalSaved() external view returns (uint256);
    function minLockDuration() external view returns (uint256);
}

contract EmergencyFacetTest is Test {
    address private constant DEPOSITOR = address(0xBEEF);
    Diamond private vault;

    receive() external payable {}

    function setUp() external {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        SavingsFacet savingsFacet = new SavingsFacet();
        EmergencyFacet emergencyFacet = new EmergencyFacet();
        VaultInit vaultInit = new VaultInit();

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](4);
        cut[0] = IDiamond.FacetCut(address(cutFacet), IDiamond.FacetCutAction.Add, VaultSelectors.diamondCut());
        cut[1] = IDiamond.FacetCut(address(loupeFacet), IDiamond.FacetCutAction.Add, VaultSelectors.diamondLoupe());
        cut[2] = IDiamond.FacetCut(address(ownershipFacet), IDiamond.FacetCutAction.Add, VaultSelectors.ownership());
        cut[3] = IDiamond.FacetCut(address(savingsFacet), IDiamond.FacetCutAction.Add, VaultSelectors.savings());

        DiamondArgs memory args = DiamondArgs({
            owner: address(this),
            init: address(vaultInit),
            initCalldata: abi.encodeWithSelector(VaultInit.init.selector, 60)
        });
        vault = new Diamond(cut, args);

        IDiamond.FacetCut[] memory emergencyCut = new IDiamond.FacetCut[](1);
        emergencyCut[0] = IDiamond.FacetCut(
            address(emergencyFacet),
            IDiamond.FacetCutAction.Add,
            VaultSelectors.emergency()
        );
        IDiamondCut(address(vault)).diamondCut(emergencyCut, address(0), "");
    }

    function testEmergencyWithdrawPaysTenPercentToOwnerBeforeUnlock() external {
        uint256 amount = 1 ether;
        vm.deal(DEPOSITOR, amount);
        vm.prank(DEPOSITOR);
        IEmergencyVault(address(vault)).deposit{value: amount}(1 days);

        uint256 ownerBalanceBefore = address(this).balance;
        uint256 depositorBalanceBefore = DEPOSITOR.balance;

        vm.prank(DEPOSITOR);
        IEmergencyVault(address(vault)).emergencyWithdraw();

        assertEq(address(this).balance - ownerBalanceBefore, amount / 10);
        assertEq(DEPOSITOR.balance - depositorBalanceBefore, amount - amount / 10);

        (uint256 savedAmount, uint64 unlockTime) = IEmergencyVault(address(vault)).savings(DEPOSITOR);
        assertEq(savedAmount, 0);
        assertEq(unlockTime, 0);
        assertEq(IEmergencyVault(address(vault)).totalSaved(), 0);
    }

    function testEmergencyWithdrawRevertsWithoutSavings() external {
        vm.expectRevert(VaultBase.NothingSaved.selector);
        vm.prank(DEPOSITOR);
        IEmergencyVault(address(vault)).emergencyWithdraw();
    }

    function testReplaceSavingsFacetAndRemoveVersionPreservesVaultState() external {
        uint256 amount = 1 ether;
        vm.deal(DEPOSITOR, amount);
        vm.prank(DEPOSITOR);
        IEmergencyVault(address(vault)).deposit{value: amount}(1 days);

        address vaultAddressBefore = address(vault);
        SavingsFacetV2 savingsFacetV2 = new SavingsFacetV2();
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](2);
        cut[0] = IDiamond.FacetCut(
            address(savingsFacetV2),
            IDiamond.FacetCutAction.Replace,
            VaultSelectors.savingsV2()
        );
        cut[1] = IDiamond.FacetCut(
            address(0),
            IDiamond.FacetCutAction.Remove,
            VaultSelectors.version()
        );
        IDiamondCut(address(vault)).diamondCut(cut, address(0), "");

        assertEq(address(vault), vaultAddressBefore);
        assertEq(
            IDiamondLoupe(address(vault)).facetAddress(SavingsFacetV2.withdraw.selector),
            address(savingsFacetV2)
        );
        assertEq(IDiamondLoupe(address(vault)).facetAddress(SavingsFacet.version.selector), address(0));
        assertEq(ISavingsVaultV2(address(vault)).minLockDuration(), 60);
        assertEq(ISavingsVaultV2(address(vault)).totalSaved(), amount);

        (uint256 savedAmount, uint64 unlockTime) = ISavingsVaultV2(address(vault)).savings(DEPOSITOR);
        assertEq(savedAmount, amount);
        assertEq(unlockTime, uint64(block.timestamp + 1 days));

        (bool versionCallSucceeded, ) = address(vault).staticcall(
            abi.encodeWithSelector(SavingsFacet.version.selector)
        );
        assertFalse(versionCallSucceeded);
    }
}
