import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { CourseWithRelations, ModuleWithVideos, VideoWithRelations } from '../lib/types'
import { db, type CourseEntity, type ModuleEntity, type VideoEntity, type VideoProgressEntity, type VideoNoteEntity } from '../lib/db'
import { importFromDirectory, deleteCourse as deleteCourseService } from '../services/library-service'
import type { ImportSummary } from '../lib/types'

interface LibrarySnapshot {
  courses: CourseEntity[]
  modules: ModuleEntity[]
  videos: VideoEntity[]
  progress: VideoProgressEntity[]
  notes: VideoNoteEntity[]
}

interface LibraryContextValue {
  courses: CourseWithRelations[]
  loading: boolean
  importCourse: (handle: FileSystemDirectoryHandle) => Promise<ImportSummary>
  deleteCourse: (courseId: string) => Promise<void>
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined)

function buildCourseRelations(snapshot: LibrarySnapshot): CourseWithRelations[] {
  const { courses, modules, videos, progress, notes } = snapshot
  const progressMap = new Map(progress.map((item) => [item.videoId, item]))
  const notesMap = new Map(notes.map((item) => [item.videoId, item]))
  const moduleOrderMap = new Map(modules.map((module) => [module.id, module.order]))

  const moduleViewMap = new Map<string, ModuleWithVideos>(
    modules.map((module) => [module.id, { ...module, videos: [] }]),
  )

  const courseVideosMap = new Map<string, VideoWithRelations[]>()

  for (const video of videos) {
    const enriched: VideoWithRelations = {
      ...video,
      progress: progressMap.get(video.id),
      note: notesMap.get(video.id),
    }

    const list = courseVideosMap.get(video.courseId)
    if (list) {
      list.push(enriched)
    } else {
      courseVideosMap.set(video.courseId, [enriched])
    }

    if (video.moduleId) {
      const moduleView = moduleViewMap.get(video.moduleId)
      moduleView?.videos.push(enriched)
    }
  }

  for (const moduleView of moduleViewMap.values()) {
    moduleView.videos.sort((a, b) => a.order - b.order)
  }

  return courses.map((course) => {
    const courseModules = modules
      .filter((module) => module.courseId === course.id)
      .map((module) => moduleViewMap.get(module.id) ?? { ...module, videos: [] })

    const courseVideos = [...(courseVideosMap.get(course.id) ?? [])]

    courseVideos.sort((a, b) => {
      const moduleOrderA = a.moduleId != null ? moduleOrderMap.get(a.moduleId) ?? Number.MAX_SAFE_INTEGER : -1
      const moduleOrderB = b.moduleId != null ? moduleOrderMap.get(b.moduleId) ?? Number.MAX_SAFE_INTEGER : -1
      if (moduleOrderA !== moduleOrderB) {
        return moduleOrderA - moduleOrderB
      }
      return a.order - b.order
    })

    return {
      ...course,
      modules: courseModules,
      videos: courseVideos,
    }
  })
}

export function LibraryProvider({ children }: PropsWithChildren) {
  const [isImporting, setIsImporting] = useState(false)
  const snapshot = useLiveQuery<LibrarySnapshot>(async () => {
    const [courses, modules, videos, progress, notes] = await Promise.all([
      db.courses.toArray(),
      db.modules.toArray(),
      db.videos.toArray(),
      db.progress.toArray(),
      db.notes.toArray(),
    ])
    return { courses, modules, videos, progress, notes }
  }, [])

  const courses = useMemo(() => {
    if (!snapshot) return []
    return buildCourseRelations(snapshot)
  }, [snapshot])

  const importCourse = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setIsImporting(true)
    try {
      return await importFromDirectory(handle, { generateThumbnails: true })
    } finally {
      setIsImporting(false)
    }
  }, [])

  const deleteCourse = useCallback(async (courseId: string) => {
    await deleteCourseService(courseId)
  }, [])

  const value = useMemo<LibraryContextValue>(
    () => ({
      courses,
      loading: snapshot == null || isImporting,
      importCourse,
      deleteCourse,
    }),
    [courses, snapshot, isImporting, importCourse, deleteCourse],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('LibraryProvider missing')
  return ctx
}
