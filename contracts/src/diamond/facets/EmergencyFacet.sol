// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";
import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract EmergencyFacet is VaultBase {
    uint256 public constant PENALTY_PERCENT = 10;
    uint256 private constant PERCENT_DENOMINATOR = 100;

    event EmergencyWithdraw(address indexed user, uint256 amount, uint256 penalty, uint256 received);

    error NoEmergencyNeeded();
    error PenaltyTransferFailed();

    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 amount = s.amount;

        if (amount == 0) revert NothingSaved();

        // Emergency withdrawal is intended for locked savings.
        if (block.timestamp >= s.unlockTime) {
            revert NoEmergencyNeeded();
        }

        uint256 penalty = (amount * PENALTY_PERCENT) / PERCENT_DENOMINATOR;

        uint256 payout = amount - penalty;
        address treasury = LibDiamond.contractOwner();

        // Update state before transferring ETH.
        s.amount = 0;
        s.unlockTime = 0;
        vs.totalSaved -= amount;

        // Send the penalty to the Diamond owner.
        (bool penaltySent,) = payable(treasury).call{value: penalty}("");
        if (!penaltySent) revert PenaltyTransferFailed();

        // Send the remaining amount to the user.
        (bool userPaid,) = payable(msg.sender).call{value: payout}("");
        if (!userPaid) revert TransferFailed();

        emit EmergencyWithdraw(msg.sender, amount, penalty, payout);
    }
}
