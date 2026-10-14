//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";

// Runs (via delegatecall) as part of an upgrade's diamondCut.
contract VaultUpgradeInit {

    function setVersion(string calldata newVersion) external {
        LibVault.vaultStorage().version = newVersion;
    }
}
