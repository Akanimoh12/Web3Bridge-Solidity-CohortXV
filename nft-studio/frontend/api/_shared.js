export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_METADATA_BYTES = 64 * 1024

const PINATA_FILE_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const PINATA_JSON_ENDPOINT = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
const GATEWAY_BASE = 'https://gateway.pinata.cloud/ipfs'

const IMAGE_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export function sendJson(res, status, payload, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  res.end(JSON.stringify(payload))
}

export function getPinataJwt() {
  const jwt = process.env.PINATA_JWT
  if (!jwt || !jwt.trim()) {
    const error = new Error(
      'The server is not configured for uploads. PINATA_JWT is missing.',
    )
    error.statusCode = 500
    error.expose = true
    throw error
  }
  return jwt.trim()
}

function bodyToBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  if (typeof value === 'string') return Buffer.from(value, 'utf8')
  return Buffer.from(JSON.stringify(value))
}

export async function readBody(req, limit) {
  // Vercel's Node.js runtime may parse the body before the handler runs and
  // expose it on req.body. Use it when present; otherwise read the raw stream
  // (which is also how the Vite dev middleware works).
  if (req.body !== undefined && req.body !== null) {
    const body = bodyToBuffer(req.body)
    if (body.length > limit) {
      const error = new Error('Payload too large.')
      error.statusCode = 413
      throw error
    }
    return body
  }

  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > limit) {
      const error = new Error('Payload too large.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function formatMegabytes(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function startsWith(buffer, signature) {
  if (buffer.length < signature.length) return false
  return signature.every((byte, index) => buffer[index] === byte)
}

export function detectImageType(buffer) {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return 'image/png'
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionFor(contentType, fallback = 'bin') {
  return IMAGE_EXTENSIONS[contentType] ?? fallback
}

export function sanitizeFileName(value, fallback = 'upload') {
  if (typeof value !== 'string') return fallback
  let name = value.trim()
  try {
    name = decodeURIComponent(name)
  } catch {
    name = value.trim()
  }
  const cleaned = name.replace(/[^\w.\- ]+/g, '_').slice(0, 80).trim()
  return cleaned || fallback
}

export function ipfsUri(cid) {
  return `ipfs://${cid}`
}

export function gatewayUrl(cid) {
  return `${GATEWAY_BASE}/${cid}`
}

function pinataErrorMessage(status) {
  if (status === 401 || status === 403) {
    return 'Pinata rejected the request. Check that PINATA_JWT is a valid Pinata API key JWT.'
  }
  if (status === 413) return 'The file is too large for Pinata.'
  if (status === 429) return 'Pinata rate limit reached. Try again in a moment.'
  return `Pinata could not process the upload (status ${status}).`
}

function pinataUnreachable() {
  const error = new Error(
    'Could not reach Pinata from the server. Check the network and try again.',
  )
  error.statusCode = 502
  error.expose = true
  return error
}

async function postToPinata(url, options) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw pinataUnreachable()
  }
  if (!response.ok) {
    const error = new Error(pinataErrorMessage(response.status))
    error.statusCode = 502
    error.pinataStatus = response.status
    error.expose = true
    throw error
  }
  return response
}

export async function pinFileToIPFS({ buffer, fileName, contentType, jwt }) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: contentType }), fileName)
  const response = await postToPinata(PINATA_FILE_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!data?.IpfsHash) {
    const error = new Error('Pinata did not return an IPFS CID.')
    error.statusCode = 502
    error.expose = true
    throw error
  }
  return { cid: data.IpfsHash, size: data.PinSize }
}

export async function pinJsonToIPFS({ content, name, jwt }) {
  const response = await postToPinata(PINATA_JSON_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: content,
      ...(name ? { pinataMetadata: { name } } : {}),
    }),
  })
  const data = await response.json().catch(() => null)
  if (!data?.IpfsHash) {
    const error = new Error('Pinata did not return an IPFS CID.')
    error.statusCode = 502
    error.expose = true
    throw error
  }
  return { cid: data.IpfsHash, size: data.PinSize }
}

export function failureResponse(error, fallbackMessage, tag) {
  const status = error?.statusCode || 500
  if (status >= 500) {
    console.error(`[${tag}]`, error?.pinataStatus ?? error?.message)
  }
  const exposable = status < 500 || error?.expose === true
  const message =
    exposable && error?.message ? error.message : fallbackMessage
  return { status, body: { error: message } }
}
