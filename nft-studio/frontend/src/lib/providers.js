import { JsonRpcProvider } from 'ethers'
import { SEPOLIA_CHAIN_ID } from './wallet'

let mainnetProvider = null
let sepoliaProvider = null

export function getMainnetProvider() {
  if (!mainnetProvider) {
    const url =
      import.meta.env.VITE_MAINNET_RPC_URL?.trim() ||
      'https://ethereum-rpc.publicnode.com'
    mainnetProvider = new JsonRpcProvider(url, 1, { staticNetwork: true })
  }
  return mainnetProvider
}

export function getSepoliaProvider() {
  if (!sepoliaProvider) {
    const url =
      import.meta.env.VITE_SEPOLIA_RPC_URL?.trim() ||
      'https://ethereum-sepolia-rpc.publicnode.com'
    sepoliaProvider = new JsonRpcProvider(url, SEPOLIA_CHAIN_ID, {
      staticNetwork: true,
    })
  }
  return sepoliaProvider
}
