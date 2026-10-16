//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibVault} from "../libraries/LibVault.sol";
import {VaultBase} from "../VaultBase.sol";

contract PauseFacet is VaultBase {
    error AlreadyPaused();
    error NotPaused();

    event PausedStateChanged(bool paused);

    function pause() external onlyOwner {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        if (vs.paused) revert AlreadyPaused();
        vs.paused = true;
        emit PausedStateChanged(true);
    }

    function unpause() external onlyOwner {
        LibVault.VaultStorage storage vs = LibVault.vaultStorage();
        if (!vs.paused) revert NotPaused();
        vs.paused = false;
        emit PausedStateChanged(false);
    }

    function paused() external view returns (bool) {
        return LibVault.vaultStorage().paused;
    }
}
