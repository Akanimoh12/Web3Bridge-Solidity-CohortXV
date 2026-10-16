//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event EmergencyWithdraw(address indexed user, uint256 amount, uint256 remaining);

    error NotLocked();
    error EmergencyAlreadyUsed(uint256 unlockTime);

    // 10% in basis points
    uint256 public constant EMERGENCY_BPS = 1_000;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // User Functions

    // Lets a user pull 10% of their savings before the unlock time, once per lock period.
    function emergencyWithdraw() external nonReentrant {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[msg.sender];

        if (s.amount == 0) revert NothingSaved();
        if (block.timestamp >= s.unlockTime) revert NotLocked();
        if (vs.emergencyUsedFor[msg.sender] == s.unlockTime) revert EmergencyAlreadyUsed(s.unlockTime);

        uint256 amount = (s.amount * EMERGENCY_BPS) / BPS_DENOMINATOR;
        if (amount == 0) revert NothingSaved();

        vs.emergencyUsedFor[msg.sender] = s.unlockTime;
        s.amount -= amount;
        vs.totalSaved -= amount;
        emit EmergencyWithdraw(msg.sender, amount, s.amount);

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // Read Functions

    // Amount `user` could emergency-withdraw right now (0 if not allowed).
    function emergencyAvailable(address user) external view returns (uint256) {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        LibVault.Savings storage s = vs.savings[user];

        if (s.amount == 0 || block.timestamp >= s.unlockTime) return 0;
        if (vs.emergencyUsedFor[user] == s.unlockTime) return 0;
        return (s.amount * EMERGENCY_BPS) / BPS_DENOMINATOR;
    }
}
