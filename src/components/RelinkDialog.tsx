import { useRef, useState, type ChangeEvent } from 'react'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { hasFilePicker, supportsFilePicker } from '../lib/browser'

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

interface RelinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoTitle: string
  onRelink: (source: FileSystemFileHandle | File) => Promise<void>
}

export function RelinkDialog({ open, onOpenChange, videoTitle, onRelink }: RelinkDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const triggerFileInput = () => {
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const [file] = files
    setLoading(true)
    setError(null)
    try {
      await onRelink(file)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      setError('Could not relink file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePick = async () => {
    try {
      setError(null)
      if (hasFilePicker(window)) {
        setLoading(true)
        const [fileHandle] = await window.showOpenFilePicker({
          multiple: false,
        })
        await onRelink(fileHandle)
        onOpenChange(false)
      } else if (supportsFilePicker(window)) {
        triggerFileInput()
      } else {
        setError('Your browser cannot relink files here. Please use a Chromium-based browser.')
      }
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
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleInputChange}
      />
    </Dialog>
  )
}
