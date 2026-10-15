import { useCallback, useEffect, useState } from 'react'
import { JsonRpcProvider } from 'ethers'
import {
  createContract,
  getContractStatus,
  getMintPaymentRequirement,
} from '../lib/contract'
import { ipfsToHttp } from '../lib/ipfs'

const SEPOLIA_READ_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL?.trim() || 'https://rpc.sepolia.org'

async function loadMetadata(uri) {
  const url = ipfsToHttp(uri)
  if (!url) return { name: null, image: null }
  try {
    const response = await fetch(url)
    if (!response.ok) return { name: null, image: null }
    const data = await response.json()
    return {
      name: typeof data?.name === 'string' ? data.name : null,
      image: typeof data?.image === 'string' ? data.image : null,
    }
  } catch {
    return { name: null, image: null }
  }
}

export function useClassNfts() {
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const status = getContractStatus()
    if (!status.configured) {
      setNfts([])
      setError(status.error ?? null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const provider = new JsonRpcProvider(SEPOLIA_READ_RPC)
      const contract = createContract(provider)
      const total = Number(await contract.totalMinted())

      const requirement = getMintPaymentRequirement()
      // The contract's mint is free (nonpayable), so every token's mint payment
      // is 0 ETH and its mint-time USD equivalent is genuinely $0. When a
      // contract charges for mints, the historical per-token price is not
      // recorded in this contract, so the USD value at mint time is unavailable.
      const mintCostLabel = requirement.requiresPayment ? 'Unavailable' : 'Free'

      const items = []
      for (let tokenId = 0; tokenId < total; tokenId += 1) {
        try {
          const [owner, tokenUri] = await Promise.all([
            contract.ownerOf(tokenId),
            contract.tokenURI(tokenId),
          ])
          const metadata = await loadMetadata(tokenUri)
          items.push({
            tokenId,
            owner,
            tokenUri,
            title: metadata.name || `Class NFT #${tokenId}`,
            image: ipfsToHttp(metadata.image),
            mintCost: mintCostLabel,
          })
        } catch {
          // Token could not be read (e.g. burned); skip it.
        }
      }

      items.reverse()
      setNfts(items)
    } catch {
      setNfts([])
      setError(
        'Could not load NFTs from the contract. Check the Sepolia RPC endpoint and try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(refresh, 0)
    return () => clearTimeout(timer)
  }, [refresh])

  return { nfts, loading, error, refresh }
}
