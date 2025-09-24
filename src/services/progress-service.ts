/**
 * @file progress-service.ts
 * @description Service utilities for querying and updating video playback progress in IndexedDB.
 * @author Meesz
 */

import { liveQuery } from 'dexie'
import { db, type VideoProgressEntity } from '../lib/db'

const defaultProgress: Omit<VideoProgressEntity, 'videoId'> = {
  lastPositionSec: 0,
  completed: false,
  completedAt: undefined,
  firstStartedAt: undefined,
  lastPlayedAt: undefined,
  playCount: 0,
}

export function createDefaultProgress(videoId: string): VideoProgressEntity {
  return {
    videoId,
    ...defaultProgress,
  }
}

export async function getProgress(videoId: string): Promise<VideoProgressEntity> {
  const stored = await db.progress.get(videoId)
  return stored ?? createDefaultProgress(videoId)
}

export async function updateProgress(
  videoId: string,
  patch: Partial<VideoProgressEntity>,
): Promise<VideoProgressEntity> {
  const current = await getProgress(videoId)
  const next: VideoProgressEntity = {
    ...current,
    ...patch,
    videoId,
  }
  await db.progress.put(next)
  return next
}

export function progressLiveQuery(videoId: string) {
  return liveQuery(async () => getProgress(videoId))
}

export async function markCompleted(videoId: string): Promise<VideoProgressEntity> {
  const now = new Date().toISOString()
  return updateProgress(videoId, {
    completed: true,
    completedAt: now,
    lastPlayedAt: now,
  })
}

export async function resetProgress(videoId: string): Promise<void> {
  await db.progress.delete(videoId)
}
