import type { CourseWithRelations, VideoWithRelations } from './types'

export interface CourseProgressSummary {
  totalVideos: number
  completedVideos: number
  percent: number
  totalDuration: number
  estimatedWatchedDuration: number
}

export function isVideoCompleted(video: VideoWithRelations) {
  return video.progress?.completed ?? false
}

export function computeVideoProgressRatio(video: VideoWithRelations): number {
  if (!video.durationSec || !video.progress) return 0
  return Math.min(1, Math.max(0, video.progress.lastPositionSec / video.durationSec))
}

export function computeCourseProgress(course: CourseWithRelations): CourseProgressSummary {
  const totalVideos = course.videos.length
  let completedVideos = 0
  let totalDuration = 0
  let estimatedWatchedDuration = 0

  for (const video of course.videos) {
    const duration = video.durationSec ?? 0
    totalDuration += duration
    if (isVideoCompleted(video)) {
      completedVideos += 1
      estimatedWatchedDuration += duration
    } else if (video.progress) {
      estimatedWatchedDuration += Math.min(duration, video.progress.lastPositionSec)
    }
  }

  const percent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

  return {
    totalVideos,
    completedVideos,
    percent,
    totalDuration,
    estimatedWatchedDuration,
  }
}
