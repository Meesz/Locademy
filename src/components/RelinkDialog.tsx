import { useState } from 'react'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { hasFilePicker } from '../lib/browser'

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface RelinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoTitle: string
  onRelink: (handle: FileSystemFileHandle) => Promise<void>
}

export function RelinkDialog({ open, onOpenChange, videoTitle, onRelink }: RelinkDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePick = async () => {
    if (!hasFilePicker(window)) {
      setError('Your browser cannot relink files here. Please use a Chromium-based browser.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
      })
      await onRelink(fileHandle)
      onOpenChange(false)
    } catch (err) {
      if (!isAbort(err)) {
        console.error(err)
        setError('Could not relink file. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Relink video</DialogTitle>
        <DialogDescription>
          Locademy cannot access <strong>{videoTitle}</strong>. Select the file again to keep your progress.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm text-slate-300">
        <p>Your notes and playback position are safe; we just need to reconnect the file on disk.</p>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-400">
          <li>Locate the new position of the video on your drive.</li>
          <li>Confirm the file selection when prompted.</li>
        </ol>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handlePick} loading={loading}>
          Choose file
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
