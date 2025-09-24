import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '../ui/button'
import { useLibrary } from '../../state/library-context'
import { cn } from '../../lib/utils'
import { hasDirectoryPicker } from '../../lib/browser'

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function AppSidebar() {
  const { courses, importCourse } = useLibrary()
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!hasDirectoryPicker(window)) {
      setError('Your browser does not support directory access yet.')
      return
    }

    try {
      setError(null)
      setImporting(true)
      const directoryHandle = await window.showDirectoryPicker()
      await importCourse(directoryHandle)
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
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950/80 p-4 backdrop-blur-lg">
      <div className="mb-6 space-y-3">
        <Button onClick={handleImport} loading={importing} className="w-full">
          Import Course Folder
        </Button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
        <div className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                'block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white',
                isActive && 'bg-sky-500/10 text-sky-200',
              )
            }
            end
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white',
                isActive && 'bg-sky-500/10 text-sky-200',
              )
            }
          >
            Settings
          </NavLink>
        </div>
        <div>
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Courses
          </h3>
          <div className="flex flex-col gap-1">
            {courses.length === 0 && (
              <p className="px-3 text-sm text-slate-500">
                No courses yet. Import a folder to get started.
              </p>
            )}
            {courses.map((course) => (
              <NavLink
                key={course.id}
                to={`/courses/${course.id}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white',
                    isActive && 'bg-sky-500/10 text-sky-200',
                  )
                }
              >
                <span className="truncate">{course.title}</span>
                <span className="text-xs text-slate-500">
                  {course.modules.length > 0 ? `${course.modules.length} mod` : `${course.videos.length} videos`}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <p className="mt-6 text-xs text-slate-600">
        Locademy stores everything locally. Your video files stay on disk.
      </p>
    </aside>
  )
}
