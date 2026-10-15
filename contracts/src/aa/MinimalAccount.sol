// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IAccount} from "@account-abstraction/contracts/interfaces/IAccount.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MinimalAccount is IAccount, Ownable {
    IEntryPoint public immutable entryPoint;

    uint256 internal constant SIG_VALIDATION_SUCCESS = 0;
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    error NotFromEntryPoint();
    error NotFromEntryPointOrOwner();
    error CallFailed(bytes result);

    modifier requireFromEntryPoint() {
        if (msg.sender != address(entryPoint)) revert NotFromEntryPoint();
        _;
    }

    modifier requireFromEntryPointOrOwner() {
        if (msg.sender != address(entryPoint) && msg.sender != owner()) revert NotFromEntryPointOrOwner();
        _;
    }

    constructor(address _entryPoint) Ownable(msg.sender) {
        entryPoint = IEntryPoint(_entryPoint);
    }

    receive() external payable {}

    /// @notice Run an arbitrary call from this account. Called by the EntryPoint (or the owner directly).
    function execute(address dest, uint256 value, bytes calldata data) external requireFromEntryPointOrOwner {
        (bool ok, bytes memory result) = dest.call{value: value}(data);
        if (!ok) revert CallFailed(result);
    }

    /// @notice The EntryPoint calls this to ask: "is this UserOp authorised, and who pays?"
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        requireFromEntryPoint
        returns (uint256 validationData)
    {
        validationData = _validateSignature(userOp, userOpHash);
        if (missingAccountFunds > 0) {
            // pay the EntryPoint what it needs to cover gas
            (bool ok,) = payable(msg.sender).call{value: missingAccountFunds}("");
            (ok); // ignore: EntryPoint verifies the deposit itself
        }
    }

    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        view
        returns (uint256)
    {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        (address signer,,) = ECDSA.tryRecover(digest, userOp.signature);
        return signer == owner() ? SIG_VALIDATION_SUCCESS : SIG_VALIDATION_FAILED;
    }
}
