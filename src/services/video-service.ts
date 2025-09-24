import { liveQuery } from 'dexie'
import { db, type StoredBlobEntity, type VideoEntity } from '../lib/db'
import { createId } from '../lib/utils'

export async function getVideo(videoId: string): Promise<VideoEntity | undefined> {
  return db.videos.get(videoId)
}

export async function getHandle(videoId: string): Promise<FileSystemFileHandle> {
  const video = await getVideo(videoId)
  if (!video) {
    throw new Error('Video not found')
  }
  return video.fileHandle
}

export type HandleValidationResult = 'ok' | 'missing' | 'no-permission'

export async function validateHandle(videoId: string): Promise<HandleValidationResult> {
  try {
    const handle = await getHandle(videoId)
    await handle.getFile()
    return 'ok'
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotFoundError') return 'missing'
      if (error.name === 'SecurityError' || error.name === 'NotAllowedError') return 'no-permission'
    }
    throw error
  }
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
