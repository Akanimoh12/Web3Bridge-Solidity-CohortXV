import { useCallback, useState } from 'react'
import { uploadImage, uploadMetadata } from '../lib/ipfs'

const IDLE = { status: 'idle', result: null, error: null }

export function useIpfsUpload() {
  const [image, setImage] = useState(IDLE)
  const [metadata, setMetadata] = useState(IDLE)

  const uploadImageFile = useCallback(async (file) => {
    setImage({ status: 'uploading', result: null, error: null })
    try {
      const result = await uploadImage(file)
      setImage({ status: 'success', result, error: null })
      return result
    } catch (error) {
      setImage({
        status: 'error',
        result: null,
        error: error?.message || 'The image upload failed.',
      })
      return null
    }
  }, [])

  const uploadMetadataJson = useCallback(async (payload) => {
    setMetadata({ status: 'uploading', result: null, error: null })
    try {
      const result = await uploadMetadata(payload)
      setMetadata({ status: 'success', result, error: null })
      return result
    } catch (error) {
      setMetadata({
        status: 'error',
        result: null,
        error: error?.message || 'The metadata upload failed.',
      })
      return null
    }
  }, [])

  const resetImage = useCallback(() => {
    setImage(IDLE)
    setMetadata(IDLE)
  }, [])

  const resetMetadata = useCallback(() => {
    setMetadata(IDLE)
  }, [])

  const resetAll = useCallback(() => {
    setImage(IDLE)
    setMetadata(IDLE)
  }, [])

  return {
    image,
    metadata,
    uploadImageFile,
    uploadMetadataJson,
    resetImage,
    resetMetadata,
    resetAll,
  }
}
