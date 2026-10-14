//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event EarlyWithdrawalCommission(address indexed user, address indexed recipient, uint256 amount);

    error CommissionRecipientNotSet();

    function pause() external onlyOwner whenNotPaused {
        LibVault.vaultStorage().paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner whenPaused {
        LibVault.vaultStorage().paused = false;
        emit Unpaused(msg.sender);
    }

    function emergencyWithdraw() external nonReentrant whenPaused {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];
        uint256 amount = s.amount;
        if (amount == 0) revert NothingSaved();

        // Integer division rounds the 10% commission down to the nearest wei.
        uint256 commission = block.timestamp < s.unlockTime ? amount / 10 : 0;
        address recipient = vs.commissionRecipient;
        if (commission != 0 && recipient == address(0)) revert CommissionRecipientNotSet();
        uint256 payout = amount - commission;

        s.amount = 0;
        s.unlockTime = 0;
        vs.totalSaved -= amount;
        emit EmergencyWithdraw(msg.sender, payout);

        (bool ok,) = payable(msg.sender).call{value: payout}("");
        if (!ok) revert TransferFailed();

        if (commission != 0) {
            emit EarlyWithdrawalCommission(msg.sender, recipient, commission);
            (ok,) = payable(recipient).call{value: commission}("");
            if (!ok) revert TransferFailed();
        }
    }

    function paused() external view returns (bool) {
        return LibVault.vaultStorage().paused;
    }

    function commissionRecipient() external view returns (address) {
        return LibVault.vaultStorage().commissionRecipient;
    }
}
