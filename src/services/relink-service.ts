import { updateVideo } from './video-service'
import { getFileFingerprint } from '../lib/file-utils'

export async function relink(videoId: string, handle: FileSystemFileHandle) {
  const fingerprint = await getFileFingerprint(handle)
  await updateVideo(videoId, {
    fileHandle: handle,
    fileFingerprint: fingerprint,
  })
}
