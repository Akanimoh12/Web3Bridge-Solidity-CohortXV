// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {EmergencyFacet} from "./EmergencyFacet.sol";
import {LibVault} from "../libraries/LibVault.sol";
import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";

contract EmergencyFacetV2 is EmergencyFacet {
    event EmergencyWithdrawalV2(address indexed user, uint256 remainingSavings);

    function emergencyWithdraw(uint256 amount) external override nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        if (amount == 0) revert InvalidAmount();
        if (s.amount < amount) revert InsufficientSavings();

        uint256 fee = amount / 10;
        if (amount % 10 != 0) fee += 1;

        uint256 payout = amount - fee;

        s.amount -= amount;
        vs.totalSaved -= amount;

        if (s.amount == 0) {
            s.unlockTime = 0;
        }

        emit EmergencyWithdrawal(msg.sender, amount, payout, fee);
        emit EmergencyWithdrawalV2(msg.sender, s.amount);

        if (payout > 0) {
            (bool sent,) = payable(msg.sender).call{value: payout}("");
            if (!sent) revert TransferFailed();
        }

        (bool feeSent,) = payable(LibDiamond.contractOwner()).call{value: fee}("");
        if (!feeSent) revert TransferFailed();
    }
}
