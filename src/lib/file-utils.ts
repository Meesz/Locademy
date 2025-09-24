/**
 * @file file-utils.ts
 * @description Helpers for identifying supported video files and building standardized file metadata fingerprints.
 * @author Meesz
 */

import type { FileFingerprint } from './db'

export type FileSource = FileSystemFileHandle | File

const VIDEO_EXTENSIONS = [
  'mp4',
  'mkv',
  'webm',
  'mov',
  'avi',
  'flv',
  'wmv',
  'm4v',
]

export function isVideoFile(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return !!ext && VIDEO_EXTENSIONS.includes(ext)
}

export function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export async function getFileFromSource(source: FileSource): Promise<File> {
  if (source instanceof File) {
    return source
  }
  return source.getFile()
}

export async function getFileFingerprint(source: FileSource): Promise<FileFingerprint> {
  const file = await getFileFromSource(source)
  return {
    size: file.size,
    lastModified: file.lastModified,
    name: file.name,
  }
}
