// Chainlink ETH / USD Data Feed on Sepolia
// Reference: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1
export const CHAINLINK_ETH_USD_ADDRESS = "0x694AA1769357215DE4FAC081bf1f309aDC325306" as `0x${string}`;

export const chainlinkAggregatorAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "description",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
