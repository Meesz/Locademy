/**
 * @file video-source-cache.ts
 * @description In-memory cache for transient File objects gathered via standard file pickers.
 */

const videoFileCache = new Map<string, File>()

export function cacheVideoFile(videoId: string, file: File) {
  videoFileCache.set(videoId, file)
}

export function cacheVideoFiles(entries: Array<{ videoId: string; file: File }>) {
  for (const entry of entries) {
    videoFileCache.set(entry.videoId, entry.file)
  }
}

export function getCachedVideoFile(videoId: string) {
  return videoFileCache.get(videoId)
}

export function removeCachedVideoFile(videoId: string) {
  videoFileCache.delete(videoId)
}

export function removeCachedVideoFiles(videoIds: Iterable<string>) {
  for (const id of videoIds) {
    videoFileCache.delete(id)
  }
}

export function clearVideoFileCache() {
  videoFileCache.clear()
}
