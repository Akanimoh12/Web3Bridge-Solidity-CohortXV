export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_HEX_CHAIN_ID = '0xaa36a7'
export const SEPOLIA_NAME = 'Sepolia'

export const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_HEX_CHAIN_ID,
  chainName: SEPOLIA_NAME,
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: [
    import.meta.env.VITE_SEPOLIA_RPC_URL?.trim() || 'https://rpc.sepolia.org',
  ],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
}

export function getInjectedEthereum() {
  const injected = window.ethereum
  if (!injected) return null
  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers.find((p) => p.isMetaMask) ?? injected.providers[0]
  }
  return injected
}

function extractErrorCode(error) {
  return (
    error?.code ??
    error?.data?.originalError?.code ??
    error?.error?.code ??
    null
  )
}

export function describeWalletError(error) {
  const code = extractErrorCode(error)
  if (code === 4001 || code === 'ACTION_REJECTED') {
    return 'Connection request was rejected in MetaMask.'
  }
  if (code === -32002) {
    return 'A connection request is already pending. Open the MetaMask extension to finish it.'
  }
  if (code === 4902) {
    return 'Sepolia is not configured in this wallet yet.'
  }
  const message = error?.shortMessage || error?.message || ''
  if (message) return message
  return 'The wallet returned an unexpected error. Check the browser console for details.'
}

export function isSepoliaChain(chainId) {
  return chainId === SEPOLIA_CHAIN_ID
}

export function networkLabel(chainId) {
  if (!chainId) return 'Unknown network'
  if (isSepoliaChain(chainId)) return SEPOLIA_NAME
  return `Chain ${chainId}`
}

export async function switchOrAddSepolia(ethereum) {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
    })
  } catch (error) {
    const code = extractErrorCode(error)
    const originalCode = error?.data?.originalError?.code
    if (code === 4902 || originalCode === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_PARAMS],
      })
      return
    }
    throw error
  }
}
