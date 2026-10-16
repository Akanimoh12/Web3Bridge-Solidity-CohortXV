import { truncateAddress } from '../lib/format'

export default function NftCard({
  image,
  title = 'Untitled',
  tokenId,
  owner,
  mintCost,
}) {
  return (
    <article className="nft-card">
      {image ? (
        <img className="nft-card__media" src={image} alt={title} />
      ) : (
        <div className="nft-card__media nft-card__media--empty" aria-hidden="true">
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="9" cy="9.5" r="1.6" fill="currentColor" />
            <path
              d="M4.5 17 L9.5 12.5 L13 15.5 L16.5 12.5 L19.5 15.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div className="nft-card__body">
        <h3 className="nft-card__title">{title}</h3>
        <dl className="nft-card__rows">
          <div className="nft-card__row">
            <dt>Token ID</dt>
            <dd>{tokenId ?? '—'}</dd>
          </div>
          <div className="nft-card__row">
            <dt>Owner</dt>
            <dd>{owner ? truncateAddress(owner) : '—'}</dd>
          </div>
          <div className="nft-card__row">
            <dt>Mint cost</dt>
            <dd>{mintCost ?? 'Unavailable'}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
