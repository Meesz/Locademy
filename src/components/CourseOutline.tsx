import { Link } from 'react-router-dom'
import type { CourseWithRelations, VideoWithRelations } from '../lib/types'
import { cn } from '../lib/utils'
import { isVideoCompleted } from '../lib/progress'

interface CourseOutlineProps {
  course: CourseWithRelations
  activeVideoId: string
}

function OutlineVideoLink({ courseId, video, index, active }: { courseId: string; video: VideoWithRelations; index: number; active: boolean }) {
  return (
    <Link
      to={`/courses/${courseId}/watch/${video.id}`}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-900/80 hover:text-white',
        active && 'bg-sky-500/10 text-sky-200',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">{String(index + 1).padStart(2, '0')}</span>
        <span className="line-clamp-1">{video.title}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {isVideoCompleted(video) ? 'Done' : video.progress?.lastPositionSec ? 'In progress' : ''}
      </span>
    </Link>
  )
}

export function CourseOutline({ course, activeVideoId }: CourseOutlineProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="text-sm font-semibold text-white">Course outline</h3>
      {course.modules.length > 0 ? (
        <div className="space-y-4">
          {course.modules.map((module) => (
            <div key={module.id} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{module.title}</p>
              <div className="space-y-1">
                {module.videos.map((video, index) => (
                  <OutlineVideoLink
                    key={video.id}
                    courseId={course.id}
                    video={video}
                    index={index}
                    active={video.id === activeVideoId}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {course.videos.map((video, index) => (
            <OutlineVideoLink
              key={video.id}
              courseId={course.id}
              video={video}
              index={index}
              active={video.id === activeVideoId}
            />
          ))}
        </div>
      )}
    </aside>
  )
}
