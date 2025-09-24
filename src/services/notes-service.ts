import { liveQuery } from 'dexie'
import { db, type VideoNoteEntity } from '../lib/db'

export async function getNote(videoId: string): Promise<VideoNoteEntity | undefined> {
  return db.notes.get(videoId)
}

export async function upsertNote(videoId: string, markdown: string): Promise<VideoNoteEntity> {
  const note: VideoNoteEntity = {
    videoId,
    markdown,
    updatedAt: new Date().toISOString(),
  }
  await db.notes.put(note)
  return note
}

export function noteLiveQuery(videoId: string) {
  return liveQuery(async () => getNote(videoId))
}
