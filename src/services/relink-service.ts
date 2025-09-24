/**
 * @file relink-service.ts
 * @description Handles updating video records when the underlying file location changes.
 * @author Meesz
 */

import { updateVideo } from './video-service'
import { getFileFingerprint } from '../lib/file-utils'

export async function relink(videoId: string, handle: FileSystemFileHandle) {
  const fingerprint = await getFileFingerprint(handle)
  await updateVideo(videoId, {
    fileHandle: handle,
    fileFingerprint: fingerprint,
  })
}
