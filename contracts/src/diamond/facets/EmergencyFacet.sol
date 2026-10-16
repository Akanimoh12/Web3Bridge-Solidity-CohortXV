//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    uint256 private constant FEE_DIVISOR = 10;

    event EmergencyWithdrawn(address indexed user, uint256 amount, uint256 fee);

    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 amount = s.amount;
        if (amount == 0) revert NothingSaved();

        uint256 fee = amount / FEE_DIVISOR;
        uint256 payout = amount - fee;
        address owner = LibDiamond.contractOwner();

        s.amount = 0;
        s.unlockTime = 0;
        vs.totalSaved -= amount;

        emit EmergencyWithdrawn(msg.sender, amount, fee);

        (bool userPaid, ) = payable(msg.sender).call{value: payout}("");
        if (!userPaid) revert TransferFailed();

        if (fee > 0) {
            (bool ownerPaid, ) = payable(owner).call{value: fee}("");
            if (!ownerPaid) revert TransferFailed();
        }
    }
}