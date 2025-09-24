/**
 * @file thumbnail-service.ts
 * @description Thumbnail capture utilities for generating preview stills and storing them for reuse.
 * @author Meesz
 */

import { getFileFromSource, type FileSource } from '../lib/file-utils'
import { storePosterBlob } from './video-service'

export interface ThumbnailOptions {
  secondsIntoVideo?: number
  captureThumbnail?: boolean
  signal?: AbortSignal
}

export interface ThumbnailCaptureResult {
  blob?: Blob
  duration?: number
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

async function captureFromVideo(
  source: FileSource,
  options: ThumbnailOptions,
): Promise<ThumbnailCaptureResult> {
  throwIfAborted(options.signal)
  const file = await getFileFromSource(source)
  throwIfAborted(options.signal)
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.src = url
  video.muted = true
  video.playsInline = true

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve()
      const onError = () => reject(new Error('Failed to load video metadata'))
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
      video.addEventListener('error', onError, { once: true })
    })

    throwIfAborted(options.signal)

    const duration = Number.isFinite(video.duration) ? video.duration : undefined

    let blob: Blob | undefined

    if (options.captureThumbnail !== false) {
      const fallbackTime = Math.min(duration ?? 3, 3)
      const targetTime = Math.min(
        Math.max(options.secondsIntoVideo ?? fallbackTime, 0.1),
        duration ? Math.max(duration - 0.1, 0.1) : 5,
      )
      video.currentTime = targetTime

      await new Promise<void>((resolve) => {
        video.addEventListener('seeked', () => resolve(), { once: true })
      })

      throwIfAborted(options.signal)
      const canvas = document.createElement('canvas')
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height)
        blob = await new Promise<Blob | undefined>((resolve) =>
          canvas.toBlob((value) => resolve(value ?? undefined), 'image/jpeg', 0.8),
        )
      }
    }

    return { blob, duration }
  } catch (error) {
    console.warn('Thumbnail capture failed', error)
    return {}
  } finally {
    video.pause()
    URL.revokeObjectURL(url)
  }
}

export async function generateThumbnailBlob(
  source: FileSource,
  options: ThumbnailOptions = {},
): Promise<ThumbnailCaptureResult> {
  return captureFromVideo(source, options)
}

export async function generateAndStoreThumbnail(
  source: FileSource,
  options: ThumbnailOptions = {},
): Promise<{ posterBlobKey?: string; durationSec?: number }> {
  const { blob, duration } = await generateThumbnailBlob(source, options)
  let posterBlobKey: string | undefined
  if (blob) {
    posterBlobKey = await storePosterBlob(blob)
  }
  return {
    posterBlobKey,
    durationSec: duration,
  }
}
