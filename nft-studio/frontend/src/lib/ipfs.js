export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

export const IPFS_GATEWAY_BASE = 'https://gateway.pinata.cloud/ipfs'

export function ipfsToHttp(uri) {
  if (!uri || typeof uri !== 'string') return null
  const trimmed = uri.trim()
  if (trimmed.startsWith('ipfs://')) {
    const cid = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '')
    return cid ? `${IPFS_GATEWAY_BASE}/${cid}` : null
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return null
}

export function validateImageFile(file) {
  if (!file) return 'Choose an image file first.'
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG, GIF, or WebP image.'
  }
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. The maximum size is 4 MB.'
  }
  return null
}

async function extractError(response) {
  try {
    const data = await response.json()
    if (data && typeof data.error === 'string' && data.error) {
      return data.error
    }
  } catch {
    // Response was not JSON; fall through to the generic message.
  }
  return `Upload failed with status ${response.status}.`
}

async function parseResult(response) {
  if (!response.ok) {
    throw new Error(await extractError(response))
  }
  const data = await response.json().catch(() => null)
  if (!data?.cid || !data?.uri) {
    throw new Error('The upload endpoint returned an unexpected response.')
  }
  return {
    cid: data.cid,
    uri: data.uri,
    gatewayUrl: data.gatewayUrl ?? null,
    size: data.size ?? null,
  }
}

export async function uploadImage(file) {
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  })
  return parseResult(response)
}

export async function uploadMetadata({ name, description, image }) {
  const response = await fetch('/api/upload-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, image }),
  })
  return parseResult(response)
}
