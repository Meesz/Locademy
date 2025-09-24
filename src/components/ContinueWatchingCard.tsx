import { Link } from 'react-router-dom'
import type { ContinueWatchingItem } from '../lib/selectors'
import { formatDuration } from '../lib/utils'
import { Progress } from './ui/progress'
import { usePosterUrl } from '../hooks/use-object-url'

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem
}

export function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
  const { course, video } = item
  const progress = video.progress
  const posterUrl = usePosterUrl(video.posterBlobKey)
  const resumeFrom = progress ? formatDuration(Math.floor(progress.lastPositionSec)) : '0:00'

  return (
    <Link
      to={`/courses/${course.id}/watch/${video.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md transition-colors hover:border-slate-700"
    >
      <div className="relative h-32 w-full overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="Video thumbnail"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-900 text-slate-600">
            <span className="text-xs">No thumbnail</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
          Resume from {resumeFrom}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">{course.title}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{video.title}</h3>
        <div className="mt-auto space-y-1">
          <Progress value={progress?.completed ? 100 : (progress ? (video.durationSec ? (progress.lastPositionSec / video.durationSec) * 100 : 0) : 0)} />
          <p className="text-xs text-slate-500">Continue watching</p>
        </div>
      </div>
    </Link>
  )
}
