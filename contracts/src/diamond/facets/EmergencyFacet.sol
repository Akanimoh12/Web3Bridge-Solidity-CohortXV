//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../../../lib/diamond-1-hardhat/contracts/libraries/LibDiamond.sol";
import {IDiamond} from "../../../lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";
import {VaultBase} from "../VaultBase.sol";

contract EmergencyFacet is VaultBase {
    event FacetAdded(address indexed facet, bytes4[] selectors);
    event FacetReplaced(address indexed facet, bytes4[] selectors);
    event FacetRemoved(bytes4[] selectors);

    error InvalidFacetAddress();

    // Emergency Functions

    function addFacet(
        address facetAddress,
        bytes4[] calldata functionSelectors
    ) external onlyOwner {
        if (facetAddress == address(0)) revert InvalidFacetAddress();
        _emergencyCut(
            facetAddress,
            IDiamond.FacetCutAction.Add,
            functionSelectors
        );
        emit FacetAdded(facetAddress, functionSelectors);
    }

    function replaceFacet(
        address facetAddress,
        bytes4[] calldata functionSelectors
    ) external onlyOwner {
        if (facetAddress == address(0)) revert InvalidFacetAddress();
        _emergencyCut(
            facetAddress,
            IDiamond.FacetCutAction.Replace,
            functionSelectors
        );
        emit FacetReplaced(facetAddress, functionSelectors);
    }

    function removeFacet(
        bytes4[] calldata functionSelectors
    ) external onlyOwner {
        _emergencyCut(
            address(0),
            IDiamond.FacetCutAction.Remove,
            functionSelectors
        );
        emit FacetRemoved(functionSelectors);
    }

    function emergencyCut(
        IDiamond.FacetCut[] calldata diamondCut,
        address init,
        bytes calldata initCalldata
    ) external onlyOwner {
        LibDiamond.diamondCut(diamondCut, init, initCalldata);
    }

    function _emergencyCut(
        address facetAddress,
        IDiamond.FacetCutAction action,
        bytes4[] calldata functionSelectors
    ) private {
        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](1);
        cut[0] = IDiamond.FacetCut({
            facetAddress: facetAddress,
            action: action,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
    }
}
