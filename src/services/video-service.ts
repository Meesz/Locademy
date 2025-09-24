/**
 * @file video-service.ts
 * @description Video metadata helpers for handle validation, poster blob storage, and reactive lookups.
 * @author Meesz
 */

import { liveQuery } from 'dexie'
import { db, type FileFingerprint, type StoredBlobEntity, type VideoEntity } from '../lib/db'
import { createId } from '../lib/utils'
import { getFileFingerprint } from '../lib/file-utils'
import { getCachedVideoFile } from './video-source-cache'

export async function getVideo(videoId: string): Promise<VideoEntity | undefined> {
  return db.videos.get(videoId)
}

function fingerprintsEqual(a: FileFingerprint, b: FileFingerprint) {
  return a.size === b.size && a.lastModified === b.lastModified && a.name === b.name
}

function fingerprintsLooselyEqual(a: FileFingerprint, b: FileFingerprint) {
  return a.size === b.size && a.name === b.name
}

async function ensureFingerprint(videoId: string, current: VideoEntity, next: FileFingerprint) {
  if (!fingerprintsEqual(current.fileFingerprint, next)) {
    await updateVideo(videoId, {
      fileFingerprint: next,
      missing: false,
    })
  } else if (current.missing) {
    await updateVideo(videoId, {
      missing: false,
    })
  }
}

export type HandleValidationResult = 'ok' | 'missing' | 'no-permission'

export interface VideoPlaybackSource {
  file: File
  handle?: FileSystemFileHandle | null
}

export interface VideoLoadResult {
  status: HandleValidationResult
  source?: VideoPlaybackSource
}

export async function loadVideoSource(videoId: string): Promise<VideoLoadResult> {
  const video = await getVideo(videoId)
  if (!video) {
    throw new Error('Video not found')
  }

  let permissionError: HandleValidationResult | undefined

  if (video.fileHandle) {
    try {
      const file = await video.fileHandle.getFile()
      const fingerprint = await getFileFingerprint(file)
      await ensureFingerprint(videoId, video, fingerprint)
      return {
        status: 'ok',
        source: { file, handle: video.fileHandle },
      }
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
          permissionError = 'no-permission'
        } else if (error.name === 'NotFoundError') {
          permissionError = 'missing'
        } else {
          throw error
        }
      } else {
        throw error
      }
    }
  }

  const cached = getCachedVideoFile(videoId)
  if (cached) {
    const cachedFingerprint = await getFileFingerprint(cached)
    if (
      fingerprintsEqual(video.fileFingerprint, cachedFingerprint) ||
      fingerprintsLooselyEqual(video.fileFingerprint, cachedFingerprint)
    ) {
      await ensureFingerprint(videoId, video, cachedFingerprint)
      return {
        status: 'ok',
        source: { file: cached, handle: null },
      }
    }
  }

  if (permissionError === 'no-permission') {
    return { status: 'no-permission' }
  }

  if (!video.missing) {
    await updateVideo(videoId, { missing: true })
  }

  return { status: 'missing' }
}

export async function updateVideo(
  videoId: string,
  patch: Partial<VideoEntity>,
): Promise<VideoEntity> {
  return db.transaction('rw', db.videos, async () => {
    const current = await db.videos.get(videoId)
    if (!current) throw new Error('Video not found')
    const next: VideoEntity = {
      ...current,
      ...patch,
      id: videoId,
      updatedAt: new Date().toISOString(),
    }
    await db.videos.put(next)
    return next
  })
}

export async function loadPosterBlob(posterBlobKey?: string | null): Promise<Blob | undefined> {
  if (!posterBlobKey) return undefined
  const stored = await db.blobs.get(posterBlobKey)
  return stored?.blob
}

export async function storePosterBlob(blob: Blob): Promise<string> {
  const id = createId()
  const entity: StoredBlobEntity = {
    id,
    blob,
    createdAt: new Date().toISOString(),
  }
  await db.blobs.put(entity)
  return id
}

export async function removePosterBlob(posterBlobKey?: string | null): Promise<void> {
  if (!posterBlobKey) return
  await db.blobs.delete(posterBlobKey)
}

export function videoLiveQuery(videoId: string) {
  return liveQuery(async () => getVideo(videoId))
}
