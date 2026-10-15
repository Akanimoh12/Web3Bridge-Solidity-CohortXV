//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ClassNFT} from "../src/nft/ClassNFT.sol";

contract DeployClassNFT is Script {
    function run() external returns (address collection) {
        vm.startBroadcast();
        ClassNFT nft = new ClassNFT();
        vm.stopBroadcast();

        collection = address(nft);
        console.log("ClassNFT deployed to:", collection);
    }
}
