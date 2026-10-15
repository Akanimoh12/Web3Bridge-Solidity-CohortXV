import { formatAge, formatUsd } from '../lib/format'
import { CHAINLINK_ETH_USD_FEED_SEPOLIA } from '../lib/priceFeed'

export default function PricePanel({ ethPrice }) {
  const {
    status,
    price,
    updatedAt,
    isStale,
    error,
    staleAfterSeconds,
  } = ethPrice

  const hasValue = price != null
  const staleMinutes = Math.round(staleAfterSeconds / 60)

  let badge
  let message

  if (status === 'idle') {
    badge = { cls: 'badge--neutral', label: 'Idle' }
    message = 'Waiting to read the ETH/USD feed on Sepolia…'
  } else if (!hasValue && status === 'error') {
    badge = { cls: 'badge--danger', label: 'Unavailable' }
    message = error || 'Could not read the ETH/USD feed.'
  } else if (!hasValue) {
    badge = { cls: 'badge--warning', label: 'Loading' }
    message = 'Reading the latest answer from the ETH/USD feed…'
  } else if (isStale) {
    badge = { cls: 'badge--warning', label: 'Stale' }
    message = `The feed's last update is older than ${staleMinutes} min, so this value is stale and is not shown as a live price.`
  } else if (error) {
    badge = { cls: 'badge--warning', label: 'Update failed' }
    message = `The last refresh failed (${error}). Showing the last successful value.`
  } else {
    badge = { cls: 'badge--success', label: 'Live' }
    message = 'Source: Chainlink ETH/USD data feed · Sepolia'
  }

  const priceDisplay = hasValue ? formatUsd(price) : '—'
  const lastUpdateDisplay = updatedAt ? formatAge(updatedAt) : '—'
  const freshnessDisplay = !hasValue
    ? '—'
    : isStale
      ? `Stale (> ${staleMinutes} min)`
      : 'Fresh'

  return (
    <section className="panel" aria-labelledby="price-heading">
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
              <path
                d="M3.5 16.5 L9 11 L13 14.5 L20.5 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.5 6.5 H20.5 V11.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="panel__title" id="price-heading">
            ETH / USD Price
          </h2>
        </div>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="price-panel" aria-live="polite">
        <p className="price-panel__value">{priceDisplay}</p>
        <div className="price-panel__meta">
          <p>
            Last update: <strong>{lastUpdateDisplay}</strong>
          </p>
          <p>
            Freshness: <strong>{freshnessDisplay}</strong>
          </p>
          <p>
            Network: <strong>Sepolia</strong>
          </p>
        </div>
        <p className="price-panel__note muted">{message}</p>
        <p className="price-panel__note muted">
          Feed: <code className="ipfs-uri">{CHAINLINK_ETH_USD_FEED_SEPOLIA}</code>
        </p>
      </div>
    </section>
  )
}
