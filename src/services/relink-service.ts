/**
 * @file relink-service.ts
 * @description Handles updating video records when the underlying file location changes.
 * @author Meesz
 */

import { db, type VideoEntity } from '../lib/db'
import { getFileFingerprint } from '../lib/file-utils'
import { updateVideo } from './video-service'
import { cacheVideoFile, cacheVideoFiles } from './video-source-cache'

export async function relink(videoId: string, source: FileSystemFileHandle | File) {
  const fingerprint = await getFileFingerprint(source)
  const handle = source instanceof File ? null : source
  await updateVideo(videoId, {
    fileHandle: handle,
    fileFingerprint: fingerprint,
    missing: false,
  })

  if (source instanceof File) {
    cacheVideoFile(videoId, source)
  }
}

function buildFingerprintKeys(video: VideoEntity) {
  const fp = video.fileFingerprint
  const fullKey = `${fp.name}::${fp.size}::${fp.lastModified}`
  const looseKey = `${fp.name}::${fp.size}`
  return { fullKey, looseKey }
}

function fingerprintKeyFromValues(name: string, size: number, lastModified: number) {
  return `${name}::${size}::${lastModified}`
}

function looseFingerprintKey(name: string, size: number) {
  return `${name}::${size}`
}

export interface BulkRelinkSummary {
  matchedIds: string[]
  unmatchedVideoIds: string[]
  unmatchedFileNames: string[]
}

export async function bulkRelinkCourse(
  courseId: string,
  input: FileList | File[],
): Promise<BulkRelinkSummary> {
  const videos = await db.videos.where('courseId').equals(courseId).toArray()
  if (videos.length === 0) {
    return { matchedIds: [], unmatchedVideoIds: [], unmatchedFileNames: [] }
  }

  const videoMapFull = new Map<string, VideoEntity[]>()
  const videoMapLoose = new Map<string, VideoEntity[]>()

  for (const video of videos) {
    const { fullKey, looseKey } = buildFingerprintKeys(video)
    const fullList = videoMapFull.get(fullKey)
    if (fullList) {
      fullList.push(video)
    } else {
      videoMapFull.set(fullKey, [video])
    }
    const looseList = videoMapLoose.get(looseKey)
    if (looseList) {
      looseList.push(video)
    } else {
      videoMapLoose.set(looseKey, [video])
    }
  }

  const matchedIds: string[] = []
  const cachedFiles: Array<{ videoId: string; file: File }> = []
  const unmatchedFileNames: string[] = []

  const arrayInput = Array.isArray(input) ? input : Array.from(input)

  for (const file of arrayInput) {
    if (!(file instanceof File)) continue
    const fp = await getFileFingerprint(file)
    const fullKey = fingerprintKeyFromValues(fp.name, fp.size, fp.lastModified)
    let videoList = videoMapFull.get(fullKey)

    if (!videoList || videoList.length === 0) {
      const looseKey = looseFingerprintKey(fp.name, fp.size)
      videoList = videoMapLoose.get(looseKey)
    }

    if (!videoList || videoList.length === 0) {
      unmatchedFileNames.push(file.name)
      continue
    }

    const video = videoList.shift()!

    const originalFullKey = fingerprintKeyFromValues(
      video.fileFingerprint.name,
      video.fileFingerprint.size,
      video.fileFingerprint.lastModified,
    )
    const originalLooseKey = looseFingerprintKey(
      video.fileFingerprint.name,
      video.fileFingerprint.size,
    )

    const fullBucket = videoMapFull.get(originalFullKey)
    if (fullBucket) {
      const index = fullBucket.findIndex((item) => item.id === video.id)
      if (index >= 0) {
        fullBucket.splice(index, 1)
      }
    }

    const looseBucket = videoMapLoose.get(originalLooseKey)
    if (looseBucket) {
      const index = looseBucket.findIndex((item) => item.id === video.id)
      if (index >= 0) {
        looseBucket.splice(index, 1)
      }
    }

    matchedIds.push(video.id)
    cachedFiles.push({ videoId: video.id, file })

    await updateVideo(video.id, {
      fileHandle: null,
      fileFingerprint: fp,
      missing: false,
    })
  }

  if (cachedFiles.length > 0) {
    cacheVideoFiles(cachedFiles)
  }

  const matchedIdSet = new Set(matchedIds)
  const unmatchedVideoIds: string[] = []
  for (const video of videos) {
    if (!matchedIdSet.has(video.id)) {
      unmatchedVideoIds.push(video.id)
      if (!video.missing) {
        await updateVideo(video.id, {
          fileHandle: null,
          missing: true,
        })
      }
    }
  }

  return {
    matchedIds,
    unmatchedVideoIds,
    unmatchedFileNames,
  }
}
