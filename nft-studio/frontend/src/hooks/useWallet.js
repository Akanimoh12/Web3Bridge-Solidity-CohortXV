import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserProvider, formatEther } from 'ethers'
import {
  describeWalletError,
  getInjectedEthereum,
  isSepoliaChain,
  networkLabel,
  switchOrAddSepolia,
} from '../lib/wallet'

export function useWallet() {
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [balance, setBalance] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [notice, setNotice] = useState(null)

  const clearNotice = useCallback(() => setNotice(null), [])

  const accountRef = useRef(null)

  useEffect(() => {
    accountRef.current = account
  }, [account])

  const applyAccount = useCallback(async (provider, nextAccount) => {
    setAccount(nextAccount)
    if (!nextAccount) {
      setBalance(null)
      return
    }
    try {
      const wei = await provider.getBalance(nextAccount)
      setBalance(formatEther(wei))
    } catch {
      setBalance(null)
    }
  }, [])

  const refreshNetwork = useCallback(async (provider) => {
    try {
      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))
    } catch {
      setChainId(null)
    }
  }, [])

  useEffect(() => {
    const ethereum = getInjectedEthereum()
    if (!ethereum?.on) return undefined
    let active = true

    const handleAccountsChanged = (accounts) => {
      if (!active) return
      if (!accounts || accounts.length === 0) {
        setAccount(null)
        setBalance(null)
        setNotice({
          tone: 'info',
          message:
            'MetaMask reported no connected accounts, so the session was cleared.',
        })
        return
      }
      applyAccount(new BrowserProvider(ethereum), accounts[0])
    }

    const handleChainChanged = async (hexChainId) => {
      if (!active) return
      const parsed = Number.parseInt(hexChainId, 16)
      setChainId(Number.isNaN(parsed) ? null : parsed)

      const currentAccount = accountRef.current
      if (!currentAccount) return
      await applyAccount(new BrowserProvider(ethereum), currentAccount)
    }

    const handleDisconnect = (error) => {
      if (!active) return
      setAccount(null)
      setBalance(null)
      setChainId(null)
      setNotice({
        tone: 'warning',
        message:
          describeWalletError(error) || 'The wallet connection was lost.',
      })
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)
    ethereum.on('disconnect', handleDisconnect)

    return () => {
      active = false
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum.removeListener?.('chainChanged', handleChainChanged)
      ethereum.removeListener?.('disconnect', handleDisconnect)
    }
  }, [applyAccount])

  useEffect(() => {
    const ethereum = getInjectedEthereum()
    if (!ethereum) return undefined
    let active = true
    const provider = new BrowserProvider(ethereum)

    provider
      .send('eth_accounts', [])
      .then(async (accounts) => {
        if (!active || !accounts?.length) return
        await refreshNetwork(provider)
        await applyAccount(provider, accounts[0])
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [applyAccount, refreshNetwork])

  const connect = useCallback(async () => {
    const ethereum = getInjectedEthereum()
    if (!ethereum) {
      setNotice({
        tone: 'error',
        message:
          'MetaMask was not detected. Install the MetaMask browser extension, then reload this page.',
      })
      return
    }
    setConnecting(true)
    try {
      const provider = new BrowserProvider(ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      if (!accounts?.length) {
        throw new Error('MetaMask returned no accounts.')
      }
      await refreshNetwork(provider)
      await applyAccount(provider, accounts[0])
      setNotice(null)
    } catch (error) {
      setNotice({ tone: 'error', message: describeWalletError(error) })
    } finally {
      setConnecting(false)
    }
  }, [applyAccount, refreshNetwork])

  const disconnect = useCallback(() => {
    setAccount(null)
    setBalance(null)
    setChainId(null)
    setNotice({
      tone: 'info',
      message:
        'Local session cleared. A website cannot revoke MetaMask permissions on its own — to fully disconnect, open MetaMask and remove this site under Settings → Connected sites.',
    })
  }, [])

  const switchToSepolia = useCallback(async () => {
    const ethereum = getInjectedEthereum()
    if (!ethereum) return
    try {
      await switchOrAddSepolia(ethereum)
      await refreshNetwork(new BrowserProvider(ethereum))
      setNotice(null)
    } catch (error) {
      setNotice({ tone: 'error', message: describeWalletError(error) })
    }
  }, [refreshNetwork])

  return {
    account,
    chainId,
    balance,
    connecting,
    notice,
    clearNotice,
    connect,
    disconnect,
    switchToSepolia,
    isSepolia: isSepoliaChain(chainId),
    networkLabel: networkLabel(chainId),
  }
}
