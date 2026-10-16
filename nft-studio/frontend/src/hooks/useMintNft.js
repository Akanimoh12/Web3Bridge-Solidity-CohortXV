import { useCallback, useState } from 'react'
import { BrowserProvider } from 'ethers'
import {
  createContract,
  describeContractError,
  getContractStatus,
} from '../lib/contract'
import {
  getInjectedEthereum,
  isSepoliaChain,
  switchOrAddSepolia,
} from '../lib/wallet'

const IDLE = { status: 'idle', result: null, error: null }

function findMintedTokenId(contract, receipt) {
  for (const log of receipt.logs ?? []) {
    try {
      const parsed = contract.interface.parseLog(log)
      if (parsed?.name === 'Minted') {
        return parsed.args.tokenId.toString()
      }
    } catch {
      // Log belongs to a different contract; ignore it.
    }
  }
  return null
}

export function useMintNft() {
  const [mint, setMint] = useState(IDLE)

  const resetMint = useCallback(() => setMint(IDLE), [])

  const mintNft = useCallback(async (uri) => {
    if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
      setMint({
        status: 'error',
        result: null,
        error: 'A metadata URI is required before minting.',
      })
      return null
    }

    setMint({ status: 'minting', result: null, error: null })

    try {
      const status = getContractStatus()
      if (status.error) throw new Error(status.error)
      if (!status.configured) {
        throw new Error(
          'The ClassNFT contract is not configured. Set VITE_CONTRACT_ADDRESS and provide the ABI in src/abi/ClassNFT.json.',
        )
      }

      const ethereum = getInjectedEthereum()
      if (!ethereum) {
        throw new Error(
          'MetaMask was not detected. Install the MetaMask browser extension, then reload this page.',
        )
      }

      const provider = new BrowserProvider(ethereum)
      const accounts = await provider.send('eth_accounts', [])
      if (!accounts?.length) {
        throw new Error('Connect your wallet before minting.')
      }

      let network = await provider.getNetwork()
      if (!isSepoliaChain(Number(network.chainId))) {
        await switchOrAddSepolia(ethereum)
        network = await provider.getNetwork()
        if (!isSepoliaChain(Number(network.chainId))) {
          throw new Error('Your wallet must be on Sepolia to mint.')
        }
      }

      const signer = await provider.getSigner()
      const contract = createContract(signer)
      const transaction = await contract.mint(uri.trim())
      const receipt = await transaction.wait()

      const result = {
        tokenId: findMintedTokenId(contract, receipt),
        transactionHash: receipt?.hash ?? transaction.hash,
        contractAddress: await contract.getAddress(),
        minter: accounts[0],
        uri: uri.trim(),
      }
      setMint({ status: 'success', result, error: null })
      return result
    } catch (error) {
      setMint({
        status: 'error',
        result: null,
        error: describeContractError(error),
      })
      return null
    }
  }, [])

  return { mint, mintNft, resetMint }
}
