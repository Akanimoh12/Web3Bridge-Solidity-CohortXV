//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VaultBase} from "../VaultBase.sol";

contract SavingsFacetV2 is VaultBase {
    /// @notice Returns the upgraded vault version.
    /// @dev Replaces the version() implementation from SavingsFacet (which returned "1.0.0").
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
