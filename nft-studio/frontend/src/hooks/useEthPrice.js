import { useCallback, useEffect, useRef, useState } from 'react'
import { getSepoliaProvider } from '../lib/providers'
import {
  PriceFeedError,
  STALE_AFTER_SECONDS,
  readEthUsdPrice,
} from '../lib/priceFeed'

export const REFRESH_INTERVAL_MS = 30000

export function useEthPrice() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [polledAt, setPolledAt] = useState(null)

  const inFlightRef = useRef(false)
  const cancelledRef = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setStatus((prev) => (prev === 'success' ? prev : 'loading'))

    try {
      const result = await readEthUsdPrice(getSepoliaProvider())
      if (cancelledRef.current) return
      setData(result)
      setError(null)
      setStatus('success')
    } catch (err) {
      if (cancelledRef.current) return
      setError(
        err instanceof PriceFeedError
          ? err.message
          : 'Could not read the ETH/USD price feed.',
      )
      setStatus((prev) => (prev === 'success' ? 'success' : 'error'))
    } finally {
      inFlightRef.current = false
      if (!cancelledRef.current) setPolledAt(Date.now())
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    const initial = setTimeout(refresh, 0)
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      cancelledRef.current = true
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [refresh])

  const updatedAt = data?.updatedAtMs ?? null
  const ageSeconds =
    updatedAt != null && polledAt != null
      ? Math.max(0, Math.floor((polledAt - updatedAt) / 1000))
      : null
  const isStale = ageSeconds != null && ageSeconds > STALE_AFTER_SECONDS

  return {
    status,
    price: data?.price ?? null,
    decimals: data?.decimals ?? null,
    roundId: data?.roundId ?? null,
    answer: data?.answer ?? null,
    updatedAt,
    ageSeconds,
    isStale,
    error,
    staleAfterSeconds: STALE_AFTER_SECONDS,
    refresh,
  }
}
