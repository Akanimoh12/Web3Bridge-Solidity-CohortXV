import { useState } from 'react'
import Notice from './Notice'
import { useEnsLookup } from '../hooks/useEnsLookup'
import { truncateAddress } from '../lib/format'

export default function EnsLookup() {
  const [query, setQuery] = useState('')
  const { status, result, error, search } = useEnsLookup()
  const searching = status === 'searching'
  const canSearch = query.trim().length > 0 && !searching

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSearch) return
    search(query)
  }

  return (
    <section className="panel" aria-labelledby="ens-heading">
      <div className="panel__header">
        <div className="panel__heading-group">
          <span className="panel__icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M16 16 L20.5 20.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="panel__title" id="ens-heading">
            ENS Lookup
          </h2>
        </div>
        <span className={`badge ${result ? 'badge--success' : 'badge--neutral'}`}>
          {result ? 'Resolved' : 'Mainnet read-only'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="ens-form" noValidate>
        <div className="field">
          <label htmlFor="ens-name">ENS name or address</label>
          <div className="field__row">
            <input
              id="ens-name"
              className="input"
              type="text"
              placeholder="vitalik.eth"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="none"
            />
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!canSearch}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p className="field__hint">
            Resolve a .eth name to an address, or enter a 0x address to reverse
            resolve it. Lookups run on Ethereum mainnet and never touch your
            wallet.
          </p>
        </div>
      </form>

      {error && (
        <Notice tone="error" onDismiss={null}>
          {error}
        </Notice>
      )}

      <div className="ens-result" aria-live="polite">
        {result && (
          <div className="ens-result__card">
            {result.avatar && (
              <img
                className="ens-result__avatar"
                src={result.avatar}
                alt={`ENS avatar for ${result.name ?? result.address}`}
              />
            )}
            <dl className="result-rows">
              {result.kind === 'name' ? (
                <>
                  <div className="result-row">
                    <dt>Name</dt>
                    <dd className="result-row__strong">{result.query}</dd>
                  </div>
                  <div className="result-row">
                    <dt>Address</dt>
                    <dd>
                      <span className="mono" title={result.address}>
                        {truncateAddress(result.address, 10, 8)}
                      </span>
                    </dd>
                  </div>
                  <div className="result-row">
                    <dt>Reverse record</dt>
                    <dd>
                      {result.reverseName ? (
                        <span className="verified">
                          {result.reverseName} · verified
                        </span>
                      ) : (
                        <span className="muted">none set</span>
                      )}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="result-row">
                    <dt>Address</dt>
                    <dd>
                      <span className="mono" title={result.address}>
                        {truncateAddress(result.address, 10, 8)}
                      </span>
                    </dd>
                  </div>
                  <div className="result-row">
                    <dt>ENS name</dt>
                    <dd>
                      {result.name ? (
                        <span className="verified">
                          {result.name} · verified
                        </span>
                      ) : (
                        <span className="muted">
                          no ENS name (reverse record not set)
                        </span>
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            <p className="ens-result__foot muted">
              Reverse records are trusted only after forward resolution
              matched the same address.
            </p>
          </div>
        )}

        {!result && status !== 'error' && (
          <div className="placeholder-block">
            <p className="placeholder-block__title">
              {searching ? 'Looking up…' : 'No lookup performed'}
            </p>
            <p className="muted">
              The verified address, reverse name, and avatar will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
