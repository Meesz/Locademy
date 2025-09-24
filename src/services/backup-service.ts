/**
 * @file backup-service.ts
 * @description Export stubs for future backup and restore functionality within Locademy.
 * @author Meesz
 */

import { db, type CourseEntity, type ModuleEntity, type VideoEntity, type VideoProgressEntity, type VideoNoteEntity, type SettingEntity } from '../lib/db'

export interface BackupManifest {
  version: number
  exportedAt: string
  courses: CourseEntity[]
  modules: ModuleEntity[]
  videos: Array<Omit<VideoEntity, 'fileHandle'>>
  progress: VideoProgressEntity[]
  notes: VideoNoteEntity[]
  settings: SettingEntity[]
}

export async function exportLibrary(): Promise<Blob> {
  const [courses, modules, videos, progress, notes, settings] = await Promise.all([
    db.courses.toArray(),
    db.modules.toArray(),
    db.videos.toArray(),
    db.progress.toArray(),
    db.notes.toArray(),
    db.settings.toArray(),
  ])

  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    courses,
    modules,
    videos: videos.map(({ fileHandle, ...rest }) => rest),
    progress,
    notes,
    settings,
  }

  const json = JSON.stringify(manifest, null, 2)
  return new Blob([json], { type: 'application/json' })
}

export async function importLibrary(_: BackupManifest): Promise<void> {
  throw new Error('Library import is not implemented in v1')
}
