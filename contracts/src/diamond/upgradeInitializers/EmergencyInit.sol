//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";

contract EmergencyInit {
    function init(uint256 penaltyBps) external {
        LibVault.vaultStorage().emergencyPenaltyBps = penaltyBps;
    }
}