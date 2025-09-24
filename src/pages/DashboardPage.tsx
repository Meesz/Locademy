/**
 * @file DashboardPage.tsx
 * @description Home dashboard displaying continue-watching items and course overview grid.
 * @author Meesz
 */

import { useLibrary } from '../state/library-context'
import { selectContinueWatching } from '../lib/selectors'
import { ContinueWatchingCard } from '../components/ContinueWatchingCard'
import { CourseCard } from '../components/CourseCard'
import { OnboardingEmptyState } from '../components/OnboardingEmptyState'

export function DashboardPage() {
  const { courses } = useLibrary()
  if (courses.length === 0) {
    return <OnboardingEmptyState />
  }

  const continueWatching = selectContinueWatching(courses)

  return (
    <div className="space-y-10">
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Continue watching</h2>
            <p className="text-sm text-slate-400">Resume where you left off across all courses.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {continueWatching.map((item) => (
              <ContinueWatchingCard key={item.video.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Your courses</h2>
          <p className="text-sm text-slate-400">Track progress, open modules, and jump into playback.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </div>
  )
}
