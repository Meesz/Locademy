/**
 * @file library-service.ts
 * @description High-level course import pipeline and reactive queries for the Locademy media library.
 * @author Meesz
 */

import { liveQuery } from 'dexie'
import { db, type CourseEntity, type ModuleEntity, type VideoEntity } from '../lib/db'
import { createId, humanizeName } from '../lib/utils'
import { getFileFingerprint, isVideoFile, naturalCompare } from '../lib/file-utils'
import { generateAndStoreThumbnail } from './thumbnail-service'
import type { ImportSummary } from '../lib/types'

interface DirectoryEntry<T extends FileSystemHandle> {
  name: string
  handle: T
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

async function listDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<{ files: DirectoryEntry<FileSystemFileHandle>[]; directories: DirectoryEntry<FileSystemDirectoryHandle>[] }> {
  const files: DirectoryEntry<FileSystemFileHandle>[] = []
  const directories: DirectoryEntry<FileSystemDirectoryHandle>[] = []

  for await (const [name, child] of handle.entries()) {
    if (child.kind === 'file') {
      files.push({ name, handle: child as FileSystemFileHandle })
    } else if (child.kind === 'directory') {
      directories.push({ name, handle: child as FileSystemDirectoryHandle })
    }
  }

  files.sort((a, b) => naturalCompare(a.name, b.name))
  directories.sort((a, b) => naturalCompare(a.name, b.name))

  return { files, directories }
}

export interface ImportOptions {
  generateThumbnails?: boolean
  signal?: AbortSignal
}

async function createVideoEntity(
  params: {
    courseId: string
    moduleId?: string | null
    order: number
    entry: DirectoryEntry<FileSystemFileHandle>
    generateThumbnails: boolean
    signal?: AbortSignal
  },
): Promise<VideoEntity> {
  const { courseId, moduleId, order, entry, generateThumbnails, signal } = params
  throwIfAborted(signal)
  const fingerprint = await getFileFingerprint(entry.handle)
  throwIfAborted(signal)

  let posterBlobKey: string | undefined
  let durationSec: number | undefined

  if (generateThumbnails) {
    const { posterBlobKey: key, durationSec: duration } = await generateAndStoreThumbnail(entry.handle, {
      secondsIntoVideo: 3,
      signal,
    })
    posterBlobKey = key
    durationSec = duration
  }

  const now = new Date().toISOString()

  return {
    id: createId(),
    courseId,
    moduleId,
    title: humanizeName(entry.name),
    order,
    fileHandle: entry.handle,
    fileFingerprint: fingerprint,
    durationSec,
    posterBlobKey,
    createdAt: now,
    updatedAt: now,
  }
}

function filterVideoFiles(entries: DirectoryEntry<FileSystemFileHandle>[]) {
  return entries.filter((entry) => isVideoFile(entry.name))
}

export async function importFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const { generateThumbnails = true, signal } = options
  throwIfAborted(signal)

  const { directories, files } = await listDirectory(dirHandle)
  const hasModules = directories.length > 0

  const courseId = createId()
  const now = new Date().toISOString()
  const course: CourseEntity = {
    id: courseId,
    title: humanizeName(dirHandle.name),
    createdAt: now,
    updatedAt: now,
  }

  const modules: ModuleEntity[] = []
  const videos: VideoEntity[] = []

  if (hasModules) {
    for (const [index, moduleEntry] of directories.entries()) {
      throwIfAborted(signal)
      const moduleId = createId()
      const module: ModuleEntity = {
        id: moduleId,
        courseId,
        title: humanizeName(moduleEntry.name),
        order: index,
      }
      modules.push(module)

      const { files: moduleFiles } = await listDirectory(moduleEntry.handle)
      const videoFiles = filterVideoFiles(moduleFiles)

      for (const [videoIndex, videoEntry] of videoFiles.entries()) {
        const videoEntity = await createVideoEntity({
          courseId,
          moduleId,
          order: videoIndex,
          entry: videoEntry,
          generateThumbnails,
          signal,
        })
        videos.push(videoEntity)
      }
    }
  } else {
    const videoFiles = filterVideoFiles(files)
    for (const [index, entry] of videoFiles.entries()) {
      const videoEntity = await createVideoEntity({
        courseId,
        moduleId: null,
        order: index,
        entry,
        generateThumbnails,
        signal,
      })
      videos.push(videoEntity)
    }
  }

  const firstPoster = videos.find((video) => !!video.posterBlobKey)?.posterBlobKey
  if (firstPoster) {
    course.coverBlobKey = firstPoster
  }

  await db.transaction('rw', [db.courses, db.modules, db.videos], async () => {
    await db.courses.add(course)
    if (modules.length > 0) {
      await db.modules.bulkAdd(modules)
    }
    if (videos.length > 0) {
      await db.videos.bulkAdd(videos)
    }
  })

  return {
    course,
    modules,
    videos,
  }
}

export function coursesLiveQuery() {
  return liveQuery(async () => {
    const courses = await db.courses.toArray()
    const modules = await db.modules.toArray()
    const videos = await db.videos.toArray()

    return courses.map((course) => {
      const courseModules = modules.filter((module) => module.courseId === course.id)
      const courseVideos = videos.filter((video) => video.courseId === course.id)
      return {
        ...course,
        modules: courseModules,
        videos: courseVideos,
      }
    })
  })
}

export function courseLiveQuery(courseId: string) {
  return liveQuery(async () => {
    const course = await db.courses.get(courseId)
    if (!course) return undefined
    const modules = await db.modules.where('courseId').equals(courseId).sortBy('order')
    const videos = await db.videos.where('courseId').equals(courseId).sortBy('order')
    return {
      ...course,
      modules,
      videos,
    }
  })
}
export async function deleteCourse(courseId: string): Promise<void> {
  const courseVideos = await db.videos.where('courseId').equals(courseId).toArray()
  const posterKeys = courseVideos
    .map((video) => video.posterBlobKey)
    .filter((key): key is string => !!key)

  await db.transaction(
    'rw',
    [db.courses, db.modules, db.videos, db.progress, db.notes],
    async () => {
      await db.courses.delete(courseId)
      await db.modules.where('courseId').equals(courseId).delete()
      await db.videos.where('courseId').equals(courseId).delete()
      await db.progress.bulkDelete(courseVideos.map((video) => video.id))
      await db.notes.bulkDelete(courseVideos.map((video) => video.id))
    },
  )

  for (const key of posterKeys) {
    await db.blobs.delete(key)
  }
}

export async function updateCourse(
  courseId: string,
  patch: Partial<Pick<CourseEntity, 'title' | 'description' | 'coverBlobKey'>>,
): Promise<void> {
  await db.courses.update(courseId, {
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}
