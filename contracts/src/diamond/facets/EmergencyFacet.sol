//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event EmergencyWithdraw(address indexed user, uint256 returned, uint256 penalty);
    event EmergencyPenaltyUpdated(uint256 bps);

    error PenaltyTooHigh();

    uint256 private constant MAX_PENALTY_BPS = 5_000; // 50% cap

    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        uint256 amount = s.amount;
        if (amount == 0) revert NothingSaved();

        // Fee applies only while the lock is still active
        uint256 penalty = block.timestamp < s.unlockTime
            ? (amount * vs.emergencyPenaltyBps) / 10_000
            : 0;
        uint256 payout = amount - penalty;

        s.amount = 0;
        s.unlockTime = 0;
        vs.totalSaved -= amount;

        emit EmergencyWithdraw(msg.sender, payout, penalty);

        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        if (!ok) revert TransferFailed();

        if (penalty > 0) {
            (bool ok2, ) = payable(LibDiamond.contractOwner()).call{value: penalty}("");
            if (!ok2) revert TransferFailed();
        }
    }

    function setEmergencyPenaltyBps(uint256 bps) external onlyOwner {
        if (bps > MAX_PENALTY_BPS) revert PenaltyTooHigh();
        LibVault.vaultStorage().emergencyPenaltyBps = bps;
        emit EmergencyPenaltyUpdated(bps);
    }

    function emergencyPenaltyBps() external view returns (uint256) {
        return LibVault.vaultStorage().emergencyPenaltyBps;
    }
}