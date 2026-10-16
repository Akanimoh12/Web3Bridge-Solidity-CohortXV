import { getAddress, isAddress } from 'ethers'
import { getMainnetProvider } from './providers'

export function normalizeEnsInput(value) {
  return (value ?? '').trim().toLowerCase()
}

export function isEnsName(value) {
  const name = normalizeEnsInput(value)
  if (name.length < 5 || name.length > 255) return false
  if (!name.endsWith('.eth')) return false
  if (/\s/.test(name)) return false
  return true
}

export function isEthAddress(value) {
  return isAddress((value ?? '').trim())
}

export async function resolveEnsName(name) {
  const normalized = normalizeEnsInput(name)
  if (!isEnsName(normalized)) {
    throw new Error('Enter a valid .eth name, such as vitalik.eth.')
  }
  const provider = getMainnetProvider()
  return provider.resolveName(normalized)
}

export async function lookupEnsName(address) {
  if (!isEthAddress(address)) return null
  const provider = getMainnetProvider()
  const checksummed = getAddress((address ?? '').trim())

  const reverseName = await provider
    .lookupAddress(checksummed)
    .catch(() => null)
  if (!reverseName) return null

  const forwardAddress = await provider
    .resolveName(reverseName)
    .catch(() => null)
  if (!forwardAddress) return null

  try {
    return getAddress(forwardAddress) === checksummed ? reverseName : null
  } catch {
    return null
  }
}

export async function getEnsAvatar(name) {
  if (!isEnsName(name)) return null
  const provider = getMainnetProvider()
  return provider.getAvatar(normalizeEnsInput(name)).catch(() => null)
}

export function describeEnsError(error) {
  const message = error?.shortMessage || error?.message || ''
  if (message) return `ENS lookup failed: ${message}`
  return 'ENS lookup failed. The Ethereum mainnet RPC endpoint may be unavailable.'
}
