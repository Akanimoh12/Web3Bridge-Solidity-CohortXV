import { Contract, formatUnits } from 'ethers'
import { SEPOLIA_CHAIN_ID } from './wallet'

export const CHAINLINK_ETH_USD_FEED_SEPOLIA =
  '0x694AA1769357215DE4FAC081bf1f309aDC325306'

export const STALE_AFTER_SECONDS = 60 * 60

const MAX_FEED_DECIMALS = 30

const ETH_USD_FEED_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'latestRoundData',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
]

export class PriceFeedError extends Error {}

export async function readEthUsdPrice(provider) {
  if (!provider) {
    throw new PriceFeedError(
      'A Sepolia RPC provider is required to read the ETH/USD price feed.',
    )
  }

  let network
  try {
    network = await provider.getNetwork()
  } catch {
    throw new PriceFeedError(
      'Could not reach the Sepolia RPC endpoint for the price feed.',
    )
  }
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new PriceFeedError(
      'The RPC provider is not connected to Sepolia, so the ETH/USD feed was not queried.',
    )
  }

  const feed = new Contract(
    CHAINLINK_ETH_USD_FEED_SEPOLIA,
    ETH_USD_FEED_ABI,
    provider,
  )

  let decimals
  let roundData
  try {
    ;[decimals, roundData] = await Promise.all([
      feed.decimals(),
      feed.latestRoundData(),
    ])
  } catch {
    throw new PriceFeedError(
      'The Chainlink ETH/USD feed did not respond. Check the Sepolia RPC and try again.',
    )
  }

  const precision = Number(decimals)
  const answer = roundData?.answer
  const updatedAt = Number(roundData?.updatedAt)
  const roundId = roundData?.roundId
  const answeredInRound = roundData?.answeredInRound

  if (!Number.isInteger(precision) || precision < 0 || precision > MAX_FEED_DECIMALS) {
    throw new PriceFeedError(
      'The feed reported an unexpected decimal precision, so the price was not trusted.',
    )
  }
  if (answer === undefined || answer === null) {
    throw new PriceFeedError('The feed returned no price answer.')
  }
  if (answer <= 0n) {
    throw new PriceFeedError(
      'The feed returned a non-positive price, which is not a valid value.',
    )
  }
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    throw new PriceFeedError('The feed returned an invalid update timestamp.')
  }
  if (
    answeredInRound !== undefined &&
    roundId !== undefined &&
    answeredInRound < roundId
  ) {
    throw new PriceFeedError(
      'The feed returned a stale round (answeredInRound is behind roundId).',
    )
  }

  return {
    price: Number(formatUnits(answer, precision)),
    decimals: precision,
    answer: answer.toString(),
    roundId: roundId?.toString?.() ?? String(roundId),
    updatedAtMs: updatedAt * 1000,
  }
}

export function describePriceAge(ageSeconds, staleAfterSeconds = STALE_AFTER_SECONDS) {
  if (ageSeconds == null) return 'unknown'
  if (ageSeconds > staleAfterSeconds) {
    const minutes = Math.round(staleAfterSeconds / 60)
    return `stale (older than ${minutes} min)`
  }
  return 'fresh'
}
