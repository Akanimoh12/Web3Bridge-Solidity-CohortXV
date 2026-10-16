import { Contract, getAddress, isAddress } from 'ethers'
import { SEPOLIA_CHAIN_ID, describeWalletError } from './wallet'
import classNftAbi from '../abi/ClassNFT.json'

const rawAddress = import.meta.env.VITE_CONTRACT_ADDRESS?.trim() ?? ''

function normalizeAddress(value) {
  if (!value) return null
  if (!isAddress(value)) {
    throw new Error('VITE_CONTRACT_ADDRESS is set but is not a valid Ethereum address.')
  }
  return getAddress(value)
}

export function getContractAbi() {
  return Array.isArray(classNftAbi) ? classNftAbi : []
}

const MINT_PRICE_FUNCTION_NAMES = [
  'mintPrice',
  'mintingFee',
  'price',
  'cost',
  'MINT_PRICE',
]

export function getMintPaymentRequirement() {
  const abi = getContractAbi()
  const mintFunction = abi.find(
    (entry) => entry.type === 'function' && entry.name === 'mint',
  )
  const requiresPayment = mintFunction?.stateMutability === 'payable'

  const priceFunction = abi.find(
    (entry) =>
      entry.type === 'function' &&
      MINT_PRICE_FUNCTION_NAMES.includes(entry.name) &&
      (entry.inputs?.length ?? 0) === 0 &&
      entry.outputs?.length === 1 &&
      entry.outputs[0].type === 'uint256',
  )

  return {
    requiresPayment,
    priceFunction: priceFunction?.name ?? null,
  }
}

export function getContractAddress() {
  return normalizeAddress(rawAddress)
}

export function getContractStatus() {
  const abiReady = getContractAbi().length > 0
  try {
    const address = normalizeAddress(rawAddress)
    return {
      configured: address !== null && abiReady,
      address,
      abiReady,
      chainId: SEPOLIA_CHAIN_ID,
      error: null,
    }
  } catch (error) {
    return {
      configured: false,
      address: null,
      abiReady,
      chainId: SEPOLIA_CHAIN_ID,
      error: error.message,
    }
  }
}

export function createContract(runner, abi = getContractAbi()) {
  const address = normalizeAddress(rawAddress)
  if (!address) {
    throw new Error(
      'The contract address is not configured. Set VITE_CONTRACT_ADDRESS in .env.local for local development or in the Vercel project environment variables for deployment.',
    )
  }
  if (!abi || !Array.isArray(abi) || abi.length === 0) {
    throw new Error(
      'The ClassNFT ABI is not configured. Add the verified ABI to src/abi/ClassNFT.json before connecting.',
    )
  }
  if (!runner) {
    throw new Error('A signer or provider is required to connect to the contract.')
  }
  return new Contract(address, abi, runner)
}

export function describeContractError(error) {
  const code = error?.code
  if (code === 4001 || code === 'ACTION_REJECTED') {
    return 'The transaction was rejected in MetaMask.'
  }
  if (code === 'INSUFFICIENT_FUNDS') {
    return 'The wallet does not have enough Sepolia ETH to pay for this transaction and gas.'
  }
  if (code === 'CALL_EXCEPTION') {
    const reason = error.reason || error.revert?.args?.join(', ')
    if (reason) return `The transaction reverted: ${reason}`
    return 'The transaction was rejected onchain. It may have been reverted.'
  }
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
    return 'The Sepolia RPC endpoint did not respond. Wait a moment and try again.'
  }
  if (code === 'NONCE_EXPIRED' || code === 'REPLACEMENT_UNDERPRICED') {
    return 'The wallet has a pending transaction with a conflicting nonce. Finish or cancel it in MetaMask, then try again.'
  }
  return describeWalletError(error)
}
