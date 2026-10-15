import {
  MAX_IMAGE_BYTES,
  detectImageType,
  extensionFor,
  failureResponse,
  formatMegabytes,
  gatewayUrl,
  getPinataJwt,
  ipfsUri,
  pinFileToIPFS,
  readBody,
  sanitizeFileName,
  sendJson,
} from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(
      res,
      405,
      { error: 'Method not allowed. Use POST.' },
      { Allow: 'POST' },
    )
  }

  try {
    const buffer = await readBody(req, MAX_IMAGE_BYTES)
    if (buffer.length === 0) {
      return sendJson(res, 400, { error: 'The request body was empty.' })
    }

    const contentType = detectImageType(buffer)
    if (!contentType) {
      return sendJson(res, 415, {
        error: 'Unsupported image format. Upload a PNG, JPEG, GIF, or WebP file.',
      })
    }

    const jwt = getPinataJwt()
    const fileName = sanitizeFileName(
      req.headers['x-file-name'],
      `nft-image.${extensionFor(contentType)}`,
    )

    const { cid, size } = await pinFileToIPFS({
      buffer,
      fileName,
      contentType,
      jwt,
    })

    return sendJson(res, 200, {
      cid,
      uri: ipfsUri(cid),
      gatewayUrl: gatewayUrl(cid),
      size: size ?? buffer.length,
      contentType,
      fileName,
    })
  } catch (error) {
    const { status, body } = failureResponse(
      error,
      'The image upload failed on the server.',
      'upload-image',
    )
    const message =
      status === 413
        ? `File is too large. The maximum size is ${formatMegabytes(MAX_IMAGE_BYTES)}.`
        : body.error
    return sendJson(res, status, { error: message })
  }
}
