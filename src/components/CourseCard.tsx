import { Link } from 'react-router-dom'
import type { CourseWithRelations } from '../lib/types'
import { computeCourseProgress } from '../lib/progress'
import { usePosterUrl } from '../hooks/use-object-url'
import { Progress } from './ui/progress'
import { cn, formatDuration } from '../lib/utils'

interface CourseCardProps {
  course: CourseWithRelations
}

export function CourseCard({ course }: CourseCardProps) {
  const posterUrl = usePosterUrl(course.coverBlobKey)
  const progress = computeCourseProgress(course)

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md shadow-black/30 transition-colors hover:border-slate-700"
    >
      <div className="relative h-36 w-full overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Course cover"
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600">
            <span className="text-sm">No thumbnail yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-slate-300">
          <span>{course.modules.length > 0 ? `${course.modules.length} modules` : `${course.videos.length} videos`}</span>
          {progress.totalDuration > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              • {formatDuration(progress.totalDuration)} total
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{course.title}</h3>
          {course.description && (
            <p className="line-clamp-2 text-sm text-slate-400">{course.description}</p>
          )}
        </div>
        <div className="mt-auto space-y-2">
          <Progress value={progress.percent} />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {progress.completedVideos} / {progress.totalVideos} completed
            </span>
            <span className={cn('text-slate-400', progress.percent === 100 && 'text-emerald-300')}>
              {progress.percent}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
