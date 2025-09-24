import type {
  CourseEntity,
  ModuleEntity,
  VideoEntity,
  VideoProgressEntity,
  VideoNoteEntity,
} from './db'

export interface ModuleWithVideos extends ModuleEntity {
  videos: VideoWithRelations[]
}

export interface VideoWithRelations extends VideoEntity {
  progress?: VideoProgressEntity
  note?: VideoNoteEntity
}

export interface CourseWithRelations extends CourseEntity {
  modules: ModuleWithVideos[]
  videos: VideoWithRelations[]
}

export interface AppSettings {
  completionThreshold: number // value between 0 and 1
  allowLastSecondsComplete: boolean
  lastSecondsWindow: number // seconds remaining that still counts as complete
}

export interface ImportSummary {
  course: CourseEntity
  modules: ModuleEntity[]
  videos: VideoEntity[]
}
