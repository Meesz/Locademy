/**
 * @file db.ts
 * @description Dexie database configuration and entity interfaces backing Locademy's persistent IndexedDB storage.
 * @author Meesz
 */

import Dexie, { type Table } from 'dexie'

export interface FileFingerprint {
  size: number
  lastModified: number
  hash?: string
}

export interface CourseEntity {
  id: string
  title: string
  description?: string
  coverBlobKey?: string
  createdAt: string
  updatedAt: string
}

export interface ModuleEntity {
  id: string
  courseId: string
  title: string
  order: number
}

export interface VideoEntity {
  id: string
  courseId: string
  moduleId?: string | null
  title: string
  order: number
  fileHandle: FileSystemFileHandle
  fileFingerprint: FileFingerprint
  durationSec?: number
  posterBlobKey?: string
  createdAt: string
  updatedAt: string
}

export interface VideoProgressEntity {
  videoId: string
  lastPositionSec: number
  completed: boolean
  completedAt?: string
  firstStartedAt?: string
  lastPlayedAt?: string
  playCount: number
}

export interface VideoNoteEntity {
  videoId: string
  markdown: string
  updatedAt: string
}

export interface SettingEntity<T = unknown> {
  key: string
  value: T
}

export interface StoredBlobEntity {
  id: string
  blob: Blob
  createdAt: string
}

export class LocademyDB extends Dexie {
  courses!: Table<CourseEntity, string>
  modules!: Table<ModuleEntity, string>
  videos!: Table<VideoEntity, string>
  progress!: Table<VideoProgressEntity, string>
  notes!: Table<VideoNoteEntity, string>
  settings!: Table<SettingEntity, string>
  blobs!: Table<StoredBlobEntity, string>

  constructor() {
    super('locademy')

    this.version(1).stores({
      courses: 'id, updatedAt',
      modules: 'id, courseId, order',
      videos: 'id, courseId, moduleId, order',
      progress: 'videoId, completed',
      notes: 'videoId',
      settings: 'key',
      blobs: 'id',
    })
  }
}

export const db = new LocademyDB()
