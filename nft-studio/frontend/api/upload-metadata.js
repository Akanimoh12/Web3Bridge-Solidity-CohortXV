import {
  MAX_METADATA_BYTES,
  failureResponse,
  gatewayUrl,
  getPinataJwt,
  ipfsUri,
  pinJsonToIPFS,
  readBody,
  sendJson,
} from './_shared.js'

const IPFS_CID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/

function parseIpfsCid(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/)
  if (!match) return null
  return IPFS_CID_PATTERN.test(match[1]) ? match[1] : null
}

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
    const body = await readBody(req, MAX_METADATA_BYTES)
    if (body.length === 0) {
      return sendJson(res, 400, { error: 'The request body was empty.' })
    }

    let payload
    try {
      payload = JSON.parse(body.toString('utf8'))
    } catch {
      return sendJson(res, 400, { error: 'The request body must be valid JSON.' })
    }

    const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
    const description =
      typeof payload?.description === 'string' ? payload.description.trim() : ''
    const imageCid = parseIpfsCid(payload?.image)

    if (!name) {
      return sendJson(res, 400, { error: 'A name is required.' })
    }
    if (name.length > 80) {
      return sendJson(res, 400, {
        error: 'The name must be 80 characters or fewer.',
      })
    }
    if (!description) {
      return sendJson(res, 400, { error: 'A description is required.' })
    }
    if (description.length > 2000) {
      return sendJson(res, 400, {
        error: 'The description must be 2000 characters or fewer.',
      })
    }
    if (!imageCid) {
      return sendJson(res, 400, {
        error:
          'The image field must be an ipfs:// URI produced by the image upload step.',
      })
    }

    const jwt = getPinataJwt()
    const content = {
      name,
      description,
      image: `ipfs://${imageCid}`,
    }

    const { cid } = await pinJsonToIPFS({
      content,
      name: `${name}.json`,
      jwt,
    })

    return sendJson(res, 200, {
      cid,
      uri: ipfsUri(cid),
      gatewayUrl: gatewayUrl(cid),
    })
  } catch (error) {
    const { status, body } = failureResponse(
      error,
      'The metadata upload failed on the server.',
      'upload-metadata',
    )
    const message = status === 413 ? 'The metadata is too large.' : body.error
    return sendJson(res, status, { error: message })
  }
}
