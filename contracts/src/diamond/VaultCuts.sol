//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IDiamond} from "lib/diamond-1-hardhat/contracts/interfaces/IDiamond.sol";

// Builders for the three diamondCut actions.
library VaultCuts {

    // Route `selectors` (which must not exist yet) to `facet`.
    function add(address facet, bytes4[] memory selectors) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    // Re-route existing `selectors` to a new `facet` deployment.
    function replace(address facet, bytes4[] memory selectors) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Replace, functionSelectors: selectors});
    }

    // Unroute `selectors` entirely. The diamond standard requires facetAddress == address(0) here.
    function remove(bytes4[] memory selectors) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut({facetAddress: address(0), action: IDiamond.FacetCutAction.Remove, functionSelectors: selectors});
    }
}
