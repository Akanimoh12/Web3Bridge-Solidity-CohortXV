// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    uint256 public constant PENALTY_PERCENT = 10;
    uint256 private constant PERCENTAGE_DENOMINATOR = 100;

    event EmergencyWithdrawal(
        address indexed user,
        uint256 amount,
        uint256 penalty,
        uint256 received
    );

    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 amount = s.amount;

        if (amount == 0) revert NothingSaved();

        uint256 penalty = (amount * PENALTY_PERCENT) /
            PERCENTAGE_DENOMINATOR;
        uint256 received = amount - penalty;

        // Clear the user's savings and unlock time.
        s.amount = 0;
        s.unlockTime = 0;

        // Remove the full savings amount from the recorded total.
        vs.totalSaved -= amount;

        // Send the remaining 90% to the user.
        (bool success, ) = payable(msg.sender).call{value: received}("");
        if (!success) revert TransferFailed();

        emit EmergencyWithdrawal(
            msg.sender,
            amount,
            penalty,
            received
        );
    }
}