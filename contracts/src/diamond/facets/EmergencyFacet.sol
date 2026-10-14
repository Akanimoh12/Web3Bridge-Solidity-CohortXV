// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    error InvalidAmount();
    error InsufficientSavings();

    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 payout, uint256 fee);

    function emergencyWithdraw(uint256 amount) external virtual nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        if (amount == 0) revert InvalidAmount();
        if (s.amount < amount) revert InsufficientSavings();

        uint256 fee = amount / 10;
        uint256 payout = amount - fee;

        // Effects before interactions
        s.amount -= amount;
        vs.totalSaved -= amount;

        if (s.amount == 0) {
            s.unlockTime = 0;
        }

        emit EmergencyWithdrawal(msg.sender, amount, payout, fee);

        (bool sent,) = payable(msg.sender).call{value: payout}("");
        if (!sent) revert TransferFailed();

        if (fee > 0) {
            (bool feeSent,) = payable(LibDiamond.contractOwner()).call{value: fee}("");
            if (!feeSent) revert TransferFailed();
        }
    }
}
