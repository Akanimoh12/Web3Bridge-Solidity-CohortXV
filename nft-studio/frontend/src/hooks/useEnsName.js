import { useEffect, useState } from 'react'
import { lookupEnsName } from '../lib/ens'

export function useEnsName(address) {
  const [entry, setEntry] = useState({ address: null, name: null })

  useEffect(() => {
    if (!address) return undefined
    let active = true
    lookupEnsName(address)
      .then((name) => {
        if (active) setEntry({ address, name })
      })
      .catch(() => {
        if (active) setEntry({ address, name: null })
      })
    return () => {
      active = false
    }
  }, [address])

  if (!address) return null
  return entry.address === address ? entry.name : null
}
