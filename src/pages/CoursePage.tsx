/**
 * @file CoursePage.tsx
 * @description Course detail screen providing progress stats and module/video listings.
 * @author Meesz
 */

import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLibrary } from '../state/library-context'
import { computeCourseProgress, isVideoCompleted } from '../lib/progress'
import { usePosterUrl } from '../hooks/use-object-url'
import { Button, buttonClasses } from '../components/ui/button'
import { ModuleSection } from '../components/ModuleSection'
import { VideoRow } from '../components/VideoRow'
import { formatDuration } from '../lib/utils'

export function CoursePage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId ?? ''
  const navigate = useNavigate()
  const { courses, deleteCourse } = useLibrary()
  const course = courses.find((item) => item.id === courseId)

  const coverUrl = usePosterUrl(course?.coverBlobKey)

  const progress = useMemo(() => (course ? computeCourseProgress(course) : null), [course])

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
        <p>Course not found.</p>
        <Link to="/" className="mt-4 text-sky-400">
          Go back to dashboard
        </Link>
      </div>
    )
  }

  const firstIncomplete = course.videos.find((video) => !isVideoCompleted(video))

  const handleDelete = async () => {
    if (!confirm(`Remove ${course.title}? This keeps your video files on disk.`)) return
    await deleteCourse(course.id)
    navigate('/')
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80">
        {coverUrl && <img src={coverUrl} alt="Course cover" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative flex flex-col gap-6 p-8 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-semibold text-white">{course.title}</h1>
              {course.description && <p className="text-sm text-slate-300">{course.description}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                <span>{course.modules.length > 0 ? `${course.modules.length} modules` : `${course.videos.length} videos`}</span>
                {progress && progress.totalDuration > 0 && (
                  <span>≈ {formatDuration(progress.totalDuration)} total runtime</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              {firstIncomplete && (
                <Link
                  to={`/courses/${course.id}/watch/${firstIncomplete.id}`}
                  className={buttonClasses({})}
                >
                  Resume course
                </Link>
              )}
              <Button variant="outline" onClick={handleDelete}>
                Remove course
              </Button>
            </div>
          </div>
          {progress && (
            <div className="flex flex-wrap gap-6 text-sm text-slate-300">
              <div>
                <span className="text-3xl font-semibold text-white">{progress.percent}%</span>
                <p className="text-xs text-slate-400">Complete</p>
              </div>
              <div>
                <span className="text-3xl font-semibold text-white">{progress.completedVideos}</span>
                <p className="text-xs text-slate-400">Videos finished</p>
              </div>
              <div>
                <span className="text-3xl font-semibold text-white">{formatDuration(progress.estimatedWatchedDuration)}</span>
                <p className="text-xs text-slate-400">Watched so far</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {course.modules.length > 0 ? (
        <div className="space-y-10">
          {course.modules.map((module) => (
            <ModuleSection key={module.id} courseId={course.id} module={module} />
          ))}
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Videos</h2>
          <div className="space-y-2">
            {course.videos.map((video, index) => (
              <VideoRow key={video.id} courseId={course.id} video={video} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
