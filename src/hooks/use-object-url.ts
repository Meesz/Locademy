/**
 * @file use-object-url.ts
 * @description React hooks for managing object URLs and loading stored poster blobs.
 * @author Meesz
 */

import { useEffect, useState } from 'react'
import { loadPosterBlob } from '../services/video-service'

export function useObjectUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return url
}

export function usePosterUrl(posterBlobKey?: string | null) {
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!posterBlobKey) {
      setBlob(null)
      return
    }
    loadPosterBlob(posterBlobKey).then((value) => {
      if (!cancelled) {
        setBlob(value ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [posterBlobKey])

  return useObjectUrl(blob)
}
