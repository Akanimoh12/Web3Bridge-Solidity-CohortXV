import { useCallback, useState } from 'react'
import { getAddress } from 'ethers'
import {
  describeEnsError,
  getEnsAvatar,
  isEnsName,
  isEthAddress,
  lookupEnsName,
  normalizeEnsInput,
  resolveEnsName,
} from '../lib/ens'

export function useEnsLookup() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const search = useCallback(async (rawQuery) => {
    const query = normalizeEnsInput(rawQuery)
    setResult(null)
    setError(null)
    setStatus('searching')

    try {
      if (isEthAddress(query)) {
        const address = getAddress(query)
        const name = await lookupEnsName(address)
        const avatar = name ? await getEnsAvatar(name) : null
        setResult({ kind: 'address', query, address, name, avatar })
        setStatus('success')
        return
      }

      if (!isEnsName(query)) {
        setError(
          'Enter a valid .eth name (for example vitalik.eth) or a 0x address.',
        )
        setStatus('error')
        return
      }

      const address = await resolveEnsName(query)
      if (!address) {
        setError(
          `No address found for “${query}”. Check the spelling and try again.`,
        )
        setStatus('error')
        return
      }

      const [reverseName, avatar] = await Promise.all([
        lookupEnsName(address),
        getEnsAvatar(query),
      ])

      setResult({
        kind: 'name',
        query,
        address,
        reverseName,
        avatar,
      })
      setStatus('success')
    } catch (err) {
      setError(describeEnsError(err))
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, search, reset }
}
