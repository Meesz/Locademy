import { Button } from './ui/button'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLibrary } from '../state/library-context'
import { supportsDirectoryHandles, supportsFilePicker } from '../lib/browser'

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function OnboardingEmptyState() {
  const { importCourse, importCourseFromFiles } = useLibrary()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supportsHandles = supportsDirectoryHandles(window)
  const supportsPicker = supportsFilePicker(window)
  const buttonLabel = supportsHandles
    ? 'Import your first course'
    : 'Import using file picker (Firefox)'

  useEffect(() => {
    const input = fileInputRef.current
    if (input) {
      input.setAttribute('webkitdirectory', '')
      input.setAttribute('directory', '')
      input.multiple = true
    }
  }, [])

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    setImporting(true)
    setError(null)
    try {
      await importCourseFromFiles(files)
    } catch (err) {
      if (!isAbortError(err)) {
        console.error(err)
        setError('Could not import files. Please try again.')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleImport = async () => {
    try {
      setError(null)
      if (supportsHandles) {
        setImporting(true)
        const directoryHandle = await window.showDirectoryPicker()
        await importCourse(directoryHandle)
      } else if (supportsPicker) {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.click()
        } else {
          setError('File picker unavailable. Please try again.')
        }
        return
      } else {
        setError('Your browser does not support file imports yet.')
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error(err)
        setError('Could not import folder. Please try again.')
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 text-center shadow-xl shadow-black/40">
      <h2 className="text-3xl font-semibold text-white">Welcome to Locademy</h2>
      <p className="mt-3 text-sm text-slate-400">
        Import a course folder from your disk. Locademy will catalog your modules, videos, and keep track of your progress.
        Everything stays local.
      </p>
      <div className="mt-8 flex justify-center">
        <Button onClick={handleImport} loading={importing} size="lg">
          {buttonLabel}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      {!supportsHandles && supportsPicker && (
        <p className="mt-2 text-xs text-slate-500">
          Tip: select the videos (or the folder) from your library. Firefox may ask you to pick the files manually.
        </p>
      )}
      <div className="mt-6 grid gap-3 text-left text-sm text-slate-400 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4">
          <h3 className="font-semibold text-white">Automatic thumbnails</h3>
          <p className="mt-1 text-xs text-slate-400">
            Locademy captures a preview image for each video so you can glance through your library quickly.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4">
          <h3 className="font-semibold text-white">Resume where you left</h3>
          <p className="mt-1 text-xs text-slate-400">
            Progress is saved every few seconds and stored offline with IndexedDB.
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleFileSelection}
      />
    </div>
  )
}
