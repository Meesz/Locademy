import type { ModuleWithVideos } from '../lib/types'
import { VideoRow } from './VideoRow'

interface ModuleSectionProps {
  courseId: string
  module: ModuleWithVideos
}

export function ModuleSection({ courseId, module }: ModuleSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{module.title}</h3>
        <p className="text-sm text-slate-400">{module.videos.length} videos</p>
      </div>
      <div className="space-y-2">
        {module.videos.map((video, index) => (
          <VideoRow key={video.id} courseId={courseId} video={video} index={index} />
        ))}
      </div>
    </section>
  )
}
