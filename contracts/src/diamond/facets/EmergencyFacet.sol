//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event EmergencyWithdraw(address indexed user, uint256 amount, uint256 ownerFee);

    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage userSavings = vs.savings[msg.sender];
        uint256 amount = userSavings.amount;

        if (amount == 0) revert NothingSaved();

        uint256 ownerFee = amount / 10;
        address vaultOwner = LibDiamond.contractOwner();

        userSavings.amount = 0;
        userSavings.unlockTime = 0;
        vs.totalSaved -= amount;

        emit EmergencyWithdraw(msg.sender, amount, ownerFee);

        if (ownerFee > 0) {
            (bool ownerTransferSucceeded, ) = payable(vaultOwner).call{value: ownerFee}("");
            if (!ownerTransferSucceeded) revert TransferFailed();
        }

        (bool userTransferSucceeded, ) = payable(msg.sender).call{value: amount - ownerFee}("");
        if (!userTransferSucceeded) revert TransferFailed();
    }
}