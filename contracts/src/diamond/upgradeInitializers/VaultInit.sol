//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {IDiamondCut} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import {IERC173} from "lib/diamond-1-hardhat/contracts/interfaces/IERC173.sol";
import {IERC165} from "lib/diamond-1-hardhat/contracts/interfaces/IERC165.sol";
import {LibVault} from "../libraries/LibVault.sol";

contract VaultInit {
    error AlreadyInitialized();

    function init(uint256 minLockDuration) external {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        if (vs.commissionRecipient != address(0)) revert AlreadyInitialized();

        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;

        vs.minLockDuration = minLockDuration;
        vs.version = "1.0.0";
        // During diamond construction, delegatecall preserves the deployer's msg.sender.
        vs.commissionRecipient = msg.sender;
    }
}
