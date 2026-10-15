import { useEffect, useMemo, useState } from 'react'
import { formatEther } from 'ethers'
import {
  createContract,
  getContractStatus,
  getMintPaymentRequirement,
} from '../lib/contract'
import { getSepoliaProvider } from '../lib/providers'

const INITIAL = { status: 'idle', wei: null, eth: null, error: null }

export function useMintCost() {
  const requirement = useMemo(() => getMintPaymentRequirement(), [])
  const [state, setState] = useState(INITIAL)

  useEffect(() => {
    let active = true

    async function load() {
      if (!requirement.requiresPayment) {
        if (active) setState({ status: 'free', wei: '0', eth: '0', error: null })
        return
      }

      if (!requirement.priceFunction) {
        if (active) {
          setState({
            status: 'unknown',
            wei: null,
            eth: null,
            error:
              'The contract requires a payment but exposes no readable price function.',
          })
        }
        return
      }

      const status = getContractStatus()
      if (!status.configured) {
        if (active) {
          setState({
            status: 'unknown',
            wei: null,
            eth: null,
            error: 'The contract is not configured, so the mint price is unknown.',
          })
        }
        return
      }

      if (active) setState({ status: 'loading', wei: null, eth: null, error: null })
      try {
        const contract = createContract(getSepoliaProvider())
        const wei = await contract[requirement.priceFunction]()
        if (!active) return
        setState({ status: 'success', wei: wei.toString(), eth: formatEther(wei), error: null })
      } catch {
        if (!active) return
        setState({
          status: 'error',
          wei: null,
          eth: null,
          error: 'Could not read the mint price from the contract.',
        })
      }
    }

    load()
    return () => {
      active = false
    }
  }, [requirement])

  return { ...state, requirement }
}
