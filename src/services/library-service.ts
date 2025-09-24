/**
 * @file library-service.ts
 * @description High-level course import pipeline and reactive queries for the Locademy media library.
 * @author Meesz
 */

import { liveQuery } from 'dexie'
import { db, type CourseEntity, type ModuleEntity, type VideoEntity } from '../lib/db'
import { createId, humanizeName } from '../lib/utils'
import { getFileFingerprint, isVideoFile, naturalCompare, type FileSource } from '../lib/file-utils'
import { generateAndStoreThumbnail } from './thumbnail-service'
import { cacheVideoFiles, removeCachedVideoFiles } from './video-source-cache'
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

interface VideoCreationOptions {
  courseId: string
  moduleId?: string | null
  order: number
  title: string
  source: FileSource
  storeHandle?: FileSystemFileHandle | null
  relativePath?: string | null
  generateThumbnails: boolean
  signal?: AbortSignal
  missingOverride?: boolean
}

async function createVideoEntityFromSource(options: VideoCreationOptions): Promise<VideoEntity> {
  const {
    courseId,
    moduleId,
    order,
    title,
    source,
    storeHandle,
    relativePath,
    generateThumbnails,
    signal,
    missingOverride,
  } = options

  throwIfAborted(signal)
  const fingerprint = await getFileFingerprint(source)
  throwIfAborted(signal)

  let posterBlobKey: string | undefined
  let durationSec: number | undefined

  if (generateThumbnails) {
    const { posterBlobKey: key, durationSec: duration } = await generateAndStoreThumbnail(source, {
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
    title,
    order,
    fileHandle: storeHandle ?? (source instanceof File ? null : source),
    fileFingerprint: fingerprint,
    relativePath: relativePath ?? null,
    missing: missingOverride ?? !storeHandle,
    durationSec,
    posterBlobKey,
    createdAt: now,
    updatedAt: now,
  }
}

function filterVideoFiles(entries: DirectoryEntry<FileSystemFileHandle>[]) {
  return entries.filter((entry) => isVideoFile(entry.name))
}

interface NormalizedFileSelection {
  file: File
  relativePath: string
}

function normalizeRelativePath(path: string | undefined): string {
  if (!path || path.trim().length === 0) return ''
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function toNormalizedFileArray(input: FileList | File[]): NormalizedFileSelection[] {
  const arrayLike = Array.isArray(input) ? input : Array.from(input)
  return arrayLike.map((file) => {
    const relativePath = normalizeRelativePath((file as File & { webkitRelativePath?: string }).webkitRelativePath)
    return {
      file,
      relativePath,
    }
  })
}

function inferModuleFromFilename(name: string): string | null {
  const withoutExtension = name.replace(/\.[^/.]+$/, '')
  const separators = [' - ', ' — ', '--', '__']

  for (const separator of separators) {
    const index = withoutExtension.indexOf(separator)
    if (index > 0) {
      const candidate = withoutExtension.slice(0, index).trim()
      if (candidate.length === 0) continue
      if (!/[a-zA-Z]/.test(candidate)) continue
      return humanizeName(candidate)
    }
  }

  return null
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
        const relativePath = `${moduleEntry.name}/${videoEntry.name}`
        const videoEntity = await createVideoEntityFromSource({
          courseId,
          moduleId,
          order: videoIndex,
          title: humanizeName(videoEntry.name),
          source: videoEntry.handle,
          storeHandle: videoEntry.handle,
          relativePath,
          generateThumbnails,
          signal,
        })
        videos.push(videoEntity)
      }
    }
  } else {
    const videoFiles = filterVideoFiles(files)
    for (const [index, entry] of videoFiles.entries()) {
      const videoEntity = await createVideoEntityFromSource({
        courseId,
        moduleId: null,
        order: index,
        title: humanizeName(entry.name),
        source: entry.handle,
        storeHandle: entry.handle,
        relativePath: entry.name,
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

interface PendingVideo {
  selection: NormalizedFileSelection
  title: string
  sortKey: string
}

interface ModuleAccumulator {
  key: string
  title: string
  orderHint: string
  firstSeenIndex: number
  files: PendingVideo[]
}

export async function importFromFileList(
  input: FileList | File[],
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const { generateThumbnails = true, signal } = options
  throwIfAborted(signal)

  const normalized = toNormalizedFileArray(input)
  const selections = normalized.filter(({ file }) => isVideoFile(file.name))

  if (selections.length === 0) {
    throw new Error('No supported video files were selected.')
  }

  const courseId = createId()
  const now = new Date().toISOString()
  const course: CourseEntity = {
    id: courseId,
    title: 'Imported Course',
    createdAt: now,
    updatedAt: now,
  }

  const moduleMap = new Map<string, ModuleAccumulator>()
  const rootVideos: PendingVideo[] = []
  let moduleSequence = 0

  for (const selection of selections) {
    throwIfAborted(signal)
    const pathSegments = normalizeRelativePath(selection.relativePath)
      .split('/')
      .filter((segment) => segment.length > 0)
    const fileName = pathSegments.pop() ?? selection.file.name

    const moduleKeyRaw = pathSegments.length > 0 ? pathSegments[0] : null
    const extraSegments = moduleKeyRaw ? pathSegments.slice(1) : pathSegments
    const extraLabel = extraSegments
      .map((segment) => humanizeName(segment))
      .filter(Boolean)
      .join(' / ')

    let title = humanizeName(fileName)
    if (extraLabel) {
      title = `${extraLabel} • ${title}`
    }

    const pending: PendingVideo = {
      selection,
      title,
      sortKey: selection.relativePath || fileName,
    }

    if (moduleKeyRaw) {
      const moduleKey = `dir:${moduleKeyRaw.toLowerCase()}`
      const existing = moduleMap.get(moduleKey)
      if (existing) {
        existing.files.push(pending)
      } else {
        moduleMap.set(moduleKey, {
          key: moduleKey,
          title: humanizeName(moduleKeyRaw),
          orderHint: moduleKeyRaw,
          firstSeenIndex: moduleSequence++,
          files: [pending],
        })
      }
    } else {
      rootVideos.push(pending)
    }
  }

  const remainingRoot: PendingVideo[] = []

  for (const pending of rootVideos) {
    throwIfAborted(signal)
    const inferredModule = inferModuleFromFilename(pending.selection.file.name)
    if (!inferredModule) {
      remainingRoot.push(pending)
      continue
    }
    const moduleKey = `infer:${inferredModule.toLowerCase()}`
    const existing = moduleMap.get(moduleKey)
    if (existing) {
      existing.files.push(pending)
    } else {
      moduleMap.set(moduleKey, {
        key: moduleKey,
        title: inferredModule,
        orderHint: inferredModule,
        firstSeenIndex: moduleSequence++,
        files: [pending],
      })
    }
  }

  const modules: ModuleEntity[] = []
  const moduleIdMap = new Map<string, string>()
  const videos: VideoEntity[] = []
  const cachedFiles: Array<{ videoId: string; file: File }> = []

  const sortedModules = Array.from(moduleMap.values()).sort((a, b) => {
    if (a.firstSeenIndex !== b.firstSeenIndex) {
      return a.firstSeenIndex - b.firstSeenIndex
    }
    return naturalCompare(a.orderHint, b.orderHint)
  })

  for (const [moduleOrder, module] of sortedModules.entries()) {
    const moduleId = createId()
    modules.push({
      id: moduleId,
      courseId,
      title: module.title,
      order: moduleOrder,
    })
    moduleIdMap.set(module.key, moduleId)

    module.files.sort((a, b) => naturalCompare(a.sortKey, b.sortKey))

    for (const [videoOrder, pending] of module.files.entries()) {
      const videoEntity = await createVideoEntityFromSource({
        courseId,
        moduleId,
        order: videoOrder,
        title: pending.title,
        source: pending.selection.file,
        storeHandle: null,
        relativePath: pending.selection.relativePath || pending.selection.file.name,
        generateThumbnails,
        signal,
        missingOverride: false,
      })
      videos.push(videoEntity)
      cachedFiles.push({ videoId: videoEntity.id, file: pending.selection.file })
    }
  }

  remainingRoot.sort((a, b) => naturalCompare(a.sortKey, b.sortKey))

  for (const [index, pending] of remainingRoot.entries()) {
    const videoEntity = await createVideoEntityFromSource({
      courseId,
      moduleId: null,
      order: index,
      title: pending.title,
      source: pending.selection.file,
      storeHandle: null,
      relativePath: pending.selection.relativePath || pending.selection.file.name,
      generateThumbnails,
      signal,
      missingOverride: false,
    })
    videos.push(videoEntity)
    cachedFiles.push({ videoId: videoEntity.id, file: pending.selection.file })
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

  if (cachedFiles.length > 0) {
    cacheVideoFiles(cachedFiles)
  }

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

  removeCachedVideoFiles(courseVideos.map((video) => video.id))

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
