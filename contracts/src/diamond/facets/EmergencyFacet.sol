//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event EmergencyWithdraw(
        address indexed depositor,
        address indexed owner,
        uint256 requestedAmount,
        uint256 fee,
        uint256 netAmount
    );

    error ZeroAmount();
    error InsufficientSavings(uint256 available, uint256 requested);

    /// @notice Returns the emergency withdrawal fee percentage (10%).
    function emergencyFeePercent() external pure returns (uint256) {
        return 10;
    }

    /// @notice Allows a depositor to make an emergency early withdrawal of their saved ETH.
    /// @dev Bypasses normal lock duration. The contract owner receives a 10% fee,
    ///      and the depositor receives the remaining 90%.
    /// @param amount The total amount of recorded savings requested to withdraw.
    function emergencyWithdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        if (s.amount == 0) revert NothingSaved();
        if (amount > s.amount) revert InsufficientSavings(s.amount, amount);

        // 10% fee to current Diamond contract owner, 90% net to depositor
        uint256 fee = (amount * 10) / 100;
        uint256 netAmount = amount - fee;

        // Checks-Effects: update accounting before initiating external transfers
        s.amount -= amount;
        if (s.amount == 0) {
            s.unlockTime = 0;
        }
        vs.totalSaved -= amount;

        address owner = LibDiamond.contractOwner();

        emit EmergencyWithdraw(msg.sender, owner, amount, fee, netAmount);

        // Interactions: transfer fee to owner, then net amount to depositor
        if (fee > 0) {
            (bool feeOk, ) = payable(owner).call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }

        (bool userOk, ) = payable(msg.sender).call{value: netAmount}("");
        if (!userOk) revert TransferFailed();
    }
}
