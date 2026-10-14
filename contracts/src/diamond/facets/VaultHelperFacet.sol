//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract VaultHelperFacet is VaultBase {
    /// @notice Returns the actual ETH balance currently held by the Diamond proxy.
    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Returns the remaining lock duration in seconds for a specific depositor.
    /// @param user The address of the depositor to query.
    /// @return remaining Seconds until unlock, or 0 if already unlocked or nothing deposited.
    function remainingLockTime(address user) external view returns (uint256 remaining) {
        uint256 unlock = LibVault.vaultStorage().savings[user].unlockTime;
        if (block.timestamp >= unlock) {
            return 0;
        }
        return unlock - block.timestamp;
    }

    /// @notice Returns whether a depositor currently has a non-zero deposit under active lock.
    /// @param user The address of the depositor to query.
    function isLockActive(address user) external view returns (bool) {
        LibVault.Savings storage s = LibVault.vaultStorage().savings[user];
        return s.amount > 0 && block.timestamp < s.unlockTime;
    }
}
