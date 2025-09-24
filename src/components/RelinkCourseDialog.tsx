import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { bulkRelinkCourse, type BulkRelinkSummary } from '../services/relink-service'
import type { VideoWithRelations } from '../lib/types'
import { supportsDirectoryHandles, supportsFilePicker } from '../lib/browser'

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface RelinkCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  videos: VideoWithRelations[]
}

export function RelinkCourseDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  videos,
}: RelinkCourseDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<BulkRelinkSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supportsHandles = supportsDirectoryHandles(window)
  const supportsPicker = supportsFilePicker(window)

  useEffect(() => {
    if (!open) {
      setSummary(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    const input = fileInputRef.current
    if (input) {
      input.setAttribute('webkitdirectory', '')
      input.setAttribute('directory', '')
      input.multiple = true
    }
  }, [])

  const unmatchedVideos = useMemo(() => {
    const map = new Map(videos.map((video) => [video.id, video]))
    return summary?.unmatchedVideoIds
      .map((id) => map.get(id))
      .filter((video): video is VideoWithRelations => !!video)
  }, [summary, videos])

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await bulkRelinkCourse(courseId, files)
      setSummary(result)
      if (result.unmatchedVideoIds.length === 0) {
        onOpenChange(false)
      }
    } catch (err) {
      if (!isAbort(err)) {
        console.error(err)
        setError('Could not relink course. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    await handleFiles(event.target.files)
  }

  const handlePick = async () => {
    if (!supportsPicker) {
      setError('Your browser does not support file imports yet.')
      return
    }
    const input = fileInputRef.current
    if (!input) {
      setError('File picker unavailable. Please try again.')
      return
    }
    input.value = ''
    input.click()
  }

  const matchedCount = summary?.matchedIds.length ?? 0
  const unmatchedFileNames = summary?.unmatchedFileNames ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Relink {courseTitle}</DialogTitle>
        <DialogDescription>
          Reconnect the video files for this course by selecting the folder (or all videos) again.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm text-slate-300">
        <p>
          Locademy matches videos by filename, size, and last modified date. In Firefox, you may need to
          relink occasionally after restarting the browser.
        </p>
        {!supportsHandles && (
          <p className="text-xs text-slate-500">
            Select the course folder (if your browser shows it) or highlight all videos that belong to this course.
          </p>
        )}
        {summary && (
          <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-3 text-xs">
            <p className="font-medium text-slate-200">
              Matched {matchedCount} file{matchedCount === 1 ? '' : 's'}.
            </p>
            {unmatchedVideos && unmatchedVideos.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-slate-400">
                  These videos still need attention:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-slate-400">
                  {unmatchedVideos.map((video) => (
                    <li key={video.id}>{video.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {unmatchedFileNames.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-slate-400">Files without a match:</p>
                <ul className="list-disc space-y-1 pl-5 text-slate-500">
                  {unmatchedFileNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button onClick={handlePick} loading={loading}>
          Select files
        </Button>
      </DialogFooter>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleFileSelection}
      />
    </Dialog>
  )
}
