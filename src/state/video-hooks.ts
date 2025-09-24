import { useLiveQuery } from 'dexie-react-hooks'
import { db, type VideoEntity } from '../lib/db'
import type { VideoWithRelations } from '../lib/types'

export function useVideo(videoId: string) {
  return useLiveQuery<VideoEntity | undefined>(async () => db.videos.get(videoId), [videoId])
}

export function useVideoWithRelations(videoId: string) {
  return useLiveQuery<VideoWithRelations | undefined>(
    async () => {
      const video = await db.videos.get(videoId)
      if (!video) return undefined
      const [progress, note] = await Promise.all([
        db.progress.get(videoId),
        db.notes.get(videoId),
      ])
      return {
        ...video,
        progress,
        note,
      }
    },
    [videoId],
  )
}
