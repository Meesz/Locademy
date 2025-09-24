import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { NavLink } from "react-router";
import { Button } from "../ui/button";
import { useLibrary } from "../../state/library-context";
import { cn } from "../../lib/utils";
import { supportsDirectoryHandles, supportsFilePicker } from "../../lib/browser";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function AppSidebar() {
  const { courses, importCourse, importCourseFromFiles } = useLibrary();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportsHandles = supportsDirectoryHandles(window);
  const supportsPicker = supportsFilePicker(window);

  useEffect(() => {
    const input = fileInputRef.current;
    if (input) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.multiple = true;
    }
  }, []);

  const handleFileSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      await importCourseFromFiles(files);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error(err);
        setError("Could not import files. Please try again.");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setError(null);
      if (supportsHandles) {
        setImporting(true);
        const directoryHandle = await window.showDirectoryPicker();
        await importCourse(directoryHandle);
      } else if (supportsPicker) {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          fileInputRef.current.click();
        } else {
          setError("File picker unavailable. Please try again.");
        }
        return;
      } else {
        setError("Your browser does not support file imports yet.");
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error(err);
        setError("Could not import folder. Please try again.");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950/80 p-4 backdrop-blur-lg">
      <div className="mb-6 space-y-3">
        <Button onClick={handleImport} loading={importing} className="w-full">
          {supportsHandles ? "Import Course Folder" : "Import using file picker"}
        </Button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {!supportsHandles && supportsPicker && (
          <p className="text-xs text-slate-500">
            Select all the videos for your course. Firefox may prompt for file access each session.
          </p>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
        <div className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white",
                isActive && "bg-sky-500/10 text-sky-200"
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
                "block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white",
                isActive && "bg-sky-500/10 text-sky-200"
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
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white",
                    isActive && "bg-sky-500/10 text-sky-200"
                  )
                }
              >
                <span className="truncate">{course.title}</span>
                <span className="text-xs text-slate-500">
                  {course.modules.length > 0
                    ? `${course.modules.length} mod`
                    : `${course.videos.length} videos`}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <p className="mt-6 text-xs text-slate-600">
        Locademy stores everything locally. Your video files stay on disk.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleFileSelection}
      />
    </aside>
  );
}
