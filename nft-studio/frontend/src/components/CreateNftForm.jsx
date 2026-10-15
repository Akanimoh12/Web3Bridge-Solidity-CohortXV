import { useEffect, useRef, useState } from 'react'
import Notice from './Notice'
import { useIpfsUpload } from '../hooks/useIpfsUpload'
import { useMintNft } from '../hooks/useMintNft'
import { useMintCost } from '../hooks/useMintCost'
import { MAX_IMAGE_BYTES, validateImageFile } from '../lib/ipfs'
import { getContractStatus } from '../lib/contract'
import { formatFileSize, formatUsd } from '../lib/format'

const EXPLORER_TX_BASE = 'https://sepolia.etherscan.io/tx'

const BADGE = {
  idle: 'badge--neutral',
  uploading: 'badge--warning',
  success: 'badge--success',
  error: 'badge--danger',
}

function statusLabel(step, kind) {
  if (step.status === 'uploading') return 'Uploading…'
  if (step.status === 'success') return kind === 'image' ? 'Pinned' : 'Pinned'
  if (step.status === 'error') return 'Failed'
  return kind === 'image' ? 'Not uploaded' : 'Not started'
}

function mintConfigMessage() {
  const { address, abiReady } = getContractStatus()
  if (address && abiReady) return 'The ClassNFT contract details are configured.'
  const missing = []
  if (!address) missing.push('the Sepolia contract address (VITE_CONTRACT_ADDRESS)')
  if (!abiReady) missing.push('the verified ClassNFT ABI (src/abi/ClassNFT.json)')
  return `Minting is blocked until ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} configured.`
}

export default function CreateNftForm({ onMinted, ethPrice }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const previewUrlRef = useRef(null)

  const {
    image,
    metadata,
    uploadImageFile,
    uploadMetadataJson,
    resetImage,
    resetMetadata,
    resetAll,
  } = useIpfsUpload()

  const { mint, mintNft, resetMint } = useMintNft()
  const mintCost = useMintCost()

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  const imageUploading = image.status === 'uploading'
  const metadataUploading = metadata.status === 'uploading'
  const minting = mint.status === 'minting'
  const busy = imageUploading || metadataUploading || minting
  const imageReady = image.status === 'success'
  const metadataReady = metadata.status === 'success'
  const partialFailure = imageReady && metadata.status === 'error'

  const canUploadImage = Boolean(file) && !busy
  const canUploadMetadata =
    imageReady &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !busy
  const canUploadAndMint =
    Boolean(file) &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !busy

  const mintBadge =
    mint.status === 'minting'
      ? 'badge--warning'
      : mint.status === 'success'
        ? 'badge--success'
        : mint.status === 'error'
          ? 'badge--danger'
          : 'badge--neutral'
  const mintLabel =
    mint.status === 'minting'
      ? 'Minting…'
      : mint.status === 'success'
        ? 'Minted'
        : mint.status === 'error'
          ? 'Failed'
          : 'Not minted'

  const primaryLabel = imageUploading || metadataUploading
    ? 'Uploading…'
    : minting
      ? 'Minting…'
      : 'Upload & Mint'

  const ethPriceValue = ethPrice?.price ?? null
  const ethPriceStale = ethPrice?.isStale ?? false

  let mintCostEthText
  let mintCostUsdText = null
  let mintCostNote

  if (mintCost.status === 'free') {
    mintCostEthText = 'Free'
    mintCostUsdText = formatUsd(0)
    mintCostNote =
      'This contract’s mint function is nonpayable, so no ETH payment is required. A free mint does not imply the NFT has any market value.'
  } else if (mintCost.status === 'loading' || mintCost.status === 'idle') {
    mintCostEthText = 'Reading…'
    mintCostNote = 'Reading the required mint price from the contract.'
  } else if (mintCost.status === 'success') {
    mintCostEthText = `${mintCost.eth} ETH`
    if (ethPriceValue != null) {
      mintCostUsdText = `${formatUsd(Number(mintCost.eth) * ethPriceValue)} (estimate)`
      mintCostNote = ethPriceStale
        ? 'USD estimate uses a stale ETH/USD feed value and may be inaccurate. The contract’s required ETH amount is authoritative.'
        : 'USD estimate uses the latest ETH/USD feed value and may change with the market price. The contract’s required ETH amount is authoritative.'
    } else {
      mintCostUsdText = 'USD estimate unavailable'
      mintCostNote =
        'The ETH/USD feed is unavailable, so no USD estimate is shown. The contract’s required ETH amount is authoritative.'
    }
  } else {
    mintCostEthText = 'Unknown'
    mintCostNote =
      mintCost.error || 'The required mint price could not be determined.'
  }

  const panelBadge =
    mint.status === 'success'
      ? { cls: 'badge--success', text: 'Minted on Sepolia' }
      : metadataReady
        ? { cls: 'badge--success', text: 'IPFS ready' }
        : busy
          ? { cls: 'badge--warning', text: minting ? 'Minting…' : 'Uploading…' }
          : image.status === 'error' ||
              metadata.status === 'error' ||
              mint.status === 'error'
            ? {
                cls: 'badge--danger',
                text: mint.status === 'error' ? 'Mint failed' : 'Upload failed',
              }
            : { cls: 'badge--neutral', text: 'IPFS · Pinata' }

  function releasePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  function handleFileChange(event) {
    const next = event.target.files?.[0] ?? null
    setError(null)
    setNotice(null)

    if (!next) {
      releasePreview()
      setFile(null)
      setPreviewUrl(null)
      resetAll()
      resetMint()
      return
    }

    const validationError = validateImageFile(next)
    if (validationError) {
      setError(validationError)
      event.target.value = ''
      return
    }

    releasePreview()
    const url = URL.createObjectURL(next)
    previewUrlRef.current = url
    setFile(next)
    setPreviewUrl(url)
    resetAll()
    resetMint()
  }

  function handleTextChange(setter, key) {
    return (event) => {
      setter(event.target.value)
      setNotice(null)
      if (key === 'title' && title.trim() !== event.target.value.trim()) {
        if (metadata.status !== 'idle') {
          resetMetadata()
          resetMint()
        }
      }
      if (
        key === 'description' &&
        description.trim() !== event.target.value.trim()
      ) {
        if (metadata.status !== 'idle') {
          resetMetadata()
          resetMint()
        }
      }
    }
  }

  async function handleUploadImage() {
    if (!canUploadImage) return
    setError(null)
    setNotice(null)
    await uploadImageFile(file)
  }

  async function handleUploadMetadata() {
    if (!canUploadMetadata) return
    setError(null)
    setNotice(null)
    await uploadMetadataJson({
      name: title.trim(),
      description: description.trim(),
      image: image.result.uri,
    })
  }

  async function handleMint() {
    if (!metadataReady || minting) return
    setError(null)
    setNotice(null)
    resetMint()

    const result = await mintNft(metadata.result.uri)
    if (result) onMinted?.()
  }

  async function handleUploadAndMint() {
    if (!canUploadAndMint) return
    setError(null)
    setNotice(null)
    resetMint()

    let imageUri = image.status === 'success' ? image.result.uri : null
    if (!imageUri) {
      const uploaded = await uploadImageFile(file)
      if (!uploaded) return
      imageUri = uploaded.uri
    }

    let metadataUri = metadata.status === 'success' ? metadata.result.uri : null
    if (!metadataUri) {
      const uploaded = await uploadMetadataJson({
        name: title.trim(),
        description: description.trim(),
        image: imageUri,
      })
      if (!uploaded) return
      metadataUri = uploaded.uri
    }

    const result = await mintNft(metadataUri)
    if (result) onMinted?.()
  }

  return (
    <section className="panel" aria-labelledby="create-heading">
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
                width="17"
                height="17"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 8.5 V15.5 M8.5 12 H15.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="panel__title" id="create-heading">
            Create NFT
          </h2>
        </div>
        <span className={`badge ${panelBadge.cls}`}>{panelBadge.text}</span>
      </div>

      <form className="create-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="field">
          <label htmlFor="nft-title">Title</label>
          <input
            id="nft-title"
            className="input"
            type="text"
            placeholder="Neon Horizon"
            value={title}
            onChange={handleTextChange(setTitle, 'title')}
            maxLength={80}
          />
        </div>

        <div className="field">
          <label htmlFor="nft-description">Description</label>
          <textarea
            id="nft-description"
            className="textarea"
            placeholder="Describe your NFT…"
            value={description}
            onChange={handleTextChange(setDescription, 'description')}
            maxLength={1000}
          />
        </div>

        <div className="field">
          <label htmlFor="nft-image">Image</label>
          <input
            id="nft-image"
            className="file-input"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={busy}
          />
          <p className="field__hint">
            PNG, JPEG, GIF, or WebP · up to {formatFileSize(MAX_IMAGE_BYTES)}
          </p>
        </div>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        {file && previewUrl ? (
          <div className="preview">
            <img
              className="preview__thumb"
              src={previewUrl}
              alt={
                title.trim()
                  ? `Preview of ${title.trim()}`
                  : 'Selected image preview'
              }
            />
            <div className="preview__meta">
              <p className="preview__name">{file.name}</p>
              <p className="preview__size">{formatFileSize(file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="placeholder-block placeholder-block--compact">
            <p className="placeholder-block__title">No image selected</p>
            <p className="muted">Choose an image file to see a preview.</p>
          </div>
        )}

        <div className="step-list">
          <div className="step">
            <span className="step__label">1 · Image to IPFS</span>
            <span className={`badge ${BADGE[image.status]}`}>
              {statusLabel(image, 'image')}
            </span>
          </div>
          <div className="step">
            <span className="step__label">2 · Metadata to IPFS</span>
            <span className={`badge ${BADGE[metadata.status]}`}>
              {statusLabel(metadata, 'metadata')}
            </span>
          </div>
          <div className="step">
            <span className="step__label">3 · Mint on Sepolia</span>
            <span className={`badge ${mintBadge}`}>{mintLabel}</span>
          </div>
        </div>

        {image.status === 'error' && (
          <Notice tone="error" onDismiss={resetImage}>
            {image.error}
          </Notice>
        )}

        {partialFailure && (
          <Notice tone="warning" onDismiss={resetMetadata}>
            The image was pinned successfully, but the metadata upload failed.
            You can retry the metadata without uploading the image again.
          </Notice>
        )}

        {metadata.status === 'error' && (
          <Notice tone="error" onDismiss={resetMetadata}>
            {metadata.error}
          </Notice>
        )}

        {imageReady && (
          <div className="result-block">
            <p className="result-block__title">Image URI</p>
            <code className="ipfs-uri">{image.result.uri}</code>
            {image.result.gatewayUrl && (
              <a
                className="text-link"
                href={image.result.gatewayUrl}
                target="_blank"
                rel="noreferrer"
              >
                View image on IPFS gateway
              </a>
            )}
          </div>
        )}

        {metadataReady && (
          <div className="result-block">
            <p className="result-block__title">Metadata URI</p>
            <code className="ipfs-uri">{metadata.result.uri}</code>
            {metadata.result.gatewayUrl && (
              <a
                className="text-link"
                href={metadata.result.gatewayUrl}
                target="_blank"
                rel="noreferrer"
              >
                View metadata on IPFS gateway
              </a>
            )}
          </div>
        )}

        {mint.status === 'error' && (
          <Notice tone="error" onDismiss={resetMint}>
            {mint.error}
          </Notice>
        )}

        {mint.status === 'success' && (
          <div className="result-block">
            <p className="result-block__title">Minted on Sepolia</p>
            <p>
              Token ID{' '}
              <strong>{mint.result.tokenId ?? '—'}</strong> minted to{' '}
              <code className="ipfs-uri">{mint.result.minter}</code>
            </p>
            {mint.result.transactionHash && (
              <a
                className="text-link"
                href={`${EXPLORER_TX_BASE}/${mint.result.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction on Etherscan
              </a>
            )}
          </div>
        )}

        {!getContractStatus().configured && (
          <Notice tone="warning">{mintConfigMessage()}</Notice>
        )}

        {notice && (
          <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.message}
          </Notice>
        )}

        <div className="result-block">
          <p className="result-block__title">Mint cost (Sepolia)</p>
          <p>
            Required: <strong>{mintCostEthText}</strong>
            {mintCostUsdText && (
              <>
                {' · ≈ '}
                <strong>{mintCostUsdText}</strong>
              </>
            )}
          </p>
          {mintCostNote && <p className="muted">{mintCostNote}</p>}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleUploadAndMint}
            disabled={!canUploadAndMint}
            aria-busy={busy}
          >
            {primaryLabel}
          </button>
        </div>
        <p className="field__hint form-actions__hint">
          {!file
            ? 'Choose an image and add a title and description to enable upload & mint.'
            : !title.trim() || !description.trim()
              ? 'Add a title and description to enable upload & mint.'
              : 'Pins the image and metadata to IPFS, then mints a ClassNFT to your wallet on Sepolia.'}
        </p>

        <details className="advanced-steps">
          <summary className="advanced-steps__summary">
            Run the steps individually
          </summary>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleUploadImage}
              disabled={!canUploadImage}
              aria-busy={imageUploading}
            >
              {imageUploading
                ? 'Uploading image…'
                : image.status === 'error'
                  ? 'Retry image upload'
                  : 'Upload image to IPFS'}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleUploadMetadata}
              disabled={!canUploadMetadata}
              aria-busy={metadataUploading}
            >
              {metadataUploading
                ? 'Uploading metadata…'
                : metadata.status === 'error'
                  ? 'Retry metadata upload'
                  : 'Create & upload metadata'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleMint}
              disabled={!metadataReady || minting}
              aria-busy={minting}
            >
              {minting ? 'Minting…' : 'Mint NFT'}
            </button>
          </div>
          <p className="field__hint form-actions__hint">
            {!imageReady
              ? 'Upload the image first, then create the metadata.'
              : !metadataReady
                ? 'Add a title and description, then upload the metadata.'
                : 'Calls ClassNFT.mint(uri) on Sepolia, then reads the new token ID from the Minted event.'}
          </p>
        </details>
      </form>
    </section>
  )
}
