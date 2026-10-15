import NftCard from './NftCard'
import Notice from './Notice'

export default function Gallery({
  nfts = [],
  loading = false,
  error = null,
  onRefresh,
}) {
  const count = nfts.length

  return (
    <section className="panel" aria-labelledby="gallery-heading">
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
              <rect
                x="3.5"
                y="3.5"
                width="7.5"
                height="7.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="13"
                y="3.5"
                width="7.5"
                height="7.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="3.5"
                y="13"
                width="7.5"
                height="7.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="13"
                y="13"
                width="7.5"
                height="7.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <h2 className="panel__title" id="gallery-heading">
            Gallery
          </h2>
        </div>
        <span className="badge badge--neutral">
          {loading ? 'Loading…' : `${count} ${count === 1 ? 'NFT' : 'NFTs'}`}
        </span>
        {onRefresh && (
          <button
            type="button"
            className="btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        )}
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {count === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="13"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="9" cy="10.5" r="1.5" fill="currentColor" />
              <path
                d="M4.5 16 L9.5 12 L13 15 L16 12.5 L19.5 15.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="empty-state__title">
            {loading ? 'Loading NFTs…' : 'No NFTs yet'}
          </p>
          <p className="empty-state__text">
            {loading
              ? 'Reading totalMinted, ownerOf, and tokenURI from the ClassNFT contract on Sepolia.'
              : 'Nothing has been minted on the ClassNFT contract yet. Mint your first token and it will appear here.'}
          </p>
        </div>
      ) : (
        <div className="gallery__grid">
          {nfts.map((nft) => (
              <NftCard
                key={nft.tokenId ?? nft.id ?? nft.title}
                image={nft.image}
                title={nft.title}
                tokenId={nft.tokenId}
                owner={nft.owner}
                mintCost={nft.mintCost}
              />
          ))}
        </div>
      )}
    </section>
  )
}
