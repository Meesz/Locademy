/**
 * @file selectors.ts
 * @description Derived selectors for building dashboard collections such as the continue watching list.
 * @author Meesz
 */

import type { CourseWithRelations, VideoWithRelations } from './types'
import { RESUME_THRESHOLD_SECONDS } from './constants'

export interface ContinueWatchingItem {
  course: CourseWithRelations
  video: VideoWithRelations
}

function getComparableTime(video: VideoWithRelations) {
  const last = video.progress?.lastPlayedAt ?? video.progress?.completedAt ?? video.progress?.firstStartedAt
  return last ? new Date(last).getTime() : 0
}

export function selectContinueWatching(courses: CourseWithRelations[]): ContinueWatchingItem[] {
  const items: ContinueWatchingItem[] = []

  for (const course of courses) {
    for (const video of course.videos) {
      const progress = video.progress
      if (!progress) continue
      if (progress.completed) continue
      if (progress.lastPositionSec < RESUME_THRESHOLD_SECONDS) continue
      items.push({ course, video })
    }
  }

  items.sort((a, b) => getComparableTime(b.video) - getComparableTime(a.video))

  return items.slice(0, 6)
}
