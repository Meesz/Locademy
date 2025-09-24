import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLibrary } from '../state/library-context'
import { useSettings } from '../state/settings-context'
import { Button, buttonClasses } from '../components/ui/button'
import { CourseOutline } from '../components/CourseOutline'
import { VideoNotes } from '../components/VideoNotes'
import { RelinkDialog } from '../components/RelinkDialog'
import { Progress } from '../components/ui/progress'
import { formatDuration } from '../lib/utils'
import { PROGRESS_SAVE_DEBOUNCE_MS, RESUME_THRESHOLD_SECONDS } from '../lib/constants'
import { updateVideo } from '../services/video-service'
import { generateAndStoreThumbnail } from '../services/thumbnail-service'
import { relink } from '../services/relink-service'
import { updateProgress } from '../services/progress-service'
import { computeCourseProgress, isVideoCompleted } from '../lib/progress'
import { selectContinueWatching } from '../lib/selectors'
import type { AppSettings, CourseWithRelations, VideoWithRelations } from '../lib/types'
import { getHandle, validateHandle } from '../services/video-service'
import { updateCourse } from '../services/library-service'

function shouldMarkCompleted(currentTime: number, duration: number, settings: AppSettings) {
  if (!Number.isFinite(duration) || duration <= 0) return false
  const ratio = currentTime / duration
  if (ratio >= settings.completionThreshold) return true
  if (settings.allowLastSecondsComplete && duration - currentTime <= settings.lastSecondsWindow) {
    return true
  }
  return false
}

export function PlayerPage() {
  const params = useParams<{ courseId: string; videoId: string }>()
  const navigate = useNavigate()
  const { courses } = useLibrary()
  const { settings } = useSettings()
  const courseId = params.courseId
  const videoId = params.videoId ?? ''

  const course = useMemo<CourseWithRelations | undefined>(() => {
    if (!courseId) {
      return courses.find((c) => c.videos.some((v) => v.id === videoId))
    }
    const match = courses.find((c) => c.id === courseId)
    if (match) return match
    return courses.find((c) => c.videos.some((v) => v.id === videoId))
  }, [courses, courseId, videoId])

  const video = useMemo<VideoWithRelations | undefined>(() => {
    if (!course) return undefined
    return course.videos.find((item) => item.id === videoId)
  }, [course, videoId])

  const otherCourses = courses.filter((item) => item.id !== course?.id)
  const recommendations = selectContinueWatching(otherCourses).slice(0, 3)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [loadingSource, setLoadingSource] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumePrompt, setResumePrompt] = useState(false)
  const [relinkOpen, setRelinkOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number | null>(video?.durationSec ?? null)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const hasMarkedCompleteRef = useRef<boolean>(video?.progress?.completed ?? false)
  const lastPlayReportedRef = useRef(false)
  const previousUrlRef = useRef<string | null>(null)

  useEffect(() => {
    hasMarkedCompleteRef.current = video?.progress?.completed ?? false
  }, [video?.progress?.completed])

  useEffect(() => {
    setResumePrompt((video?.progress?.lastPositionSec ?? 0) > RESUME_THRESHOLD_SECONDS && !(video?.progress?.completed ?? false))
  }, [video?.progress?.lastPositionSec, video?.progress?.completed])

  const cleanupUrl = useCallback(() => {
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current)
      previousUrlRef.current = null
    }
  }, [])

  const updateSource = useCallback(
    (url: string | null) => {
      cleanupUrl()
      if (url) {
        previousUrlRef.current = url
      }
      setSourceUrl(url)
    },
    [cleanupUrl],
  )

  const refreshSource = useCallback(async () => {
    if (!video) return
    setLoadingSource(true)
    let createdUrl: string | null = null
    try {
      const status = await validateHandle(video.id)
      if (status !== 'ok') {
        setError(status === 'missing' ? 'Video file is missing.' : 'Permission required to access this file.')
        setRelinkOpen(true)
        updateSource(null)
        return
      }
      const handle = await getHandle(video.id)
      const file = await handle.getFile()
      createdUrl = URL.createObjectURL(file)
      setFileHandle(handle)
      updateSource(createdUrl)
      setError(null)
      setRelinkOpen(false)
    } catch (err) {
      console.error(err)
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
      setError('Could not load video. It may require re-importing.')
    } finally {
      setLoadingSource(false)
    }
  }, [updateSource, video])

  useEffect(() => {
    refreshSource()
    return () => {
      cleanupUrl()
      setFileHandle(null)
    }
  }, [refreshSource, cleanupUrl])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const queueProgressSave = useCallback(
    (time: number) => {
      if (!video) return
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        void updateProgress(video.id, {
          lastPositionSec: time,
          lastPlayedAt: new Date().toISOString(),
        })
      }, PROGRESS_SAVE_DEBOUNCE_MS)
    },
    [video],
  )

  const handleMarkCompleted = useCallback(
    async (durationSeconds: number) => {
      if (!video) return
      hasMarkedCompleteRef.current = true
      const now = new Date().toISOString()
      await updateProgress(video.id, {
        completed: true,
        completedAt: now,
        lastPlayedAt: now,
        lastPositionSec: durationSeconds,
      })
    },
    [video],
  )

  const handleLoadedMetadata = useCallback(async () => {
    const element = videoRef.current
    if (!element || !video) return
    const videoDuration = Number.isFinite(element.duration) ? element.duration : undefined
    if (videoDuration) {
      setDuration(videoDuration)
      if (!video.durationSec || Math.abs(video.durationSec - videoDuration) > 1) {
        await updateVideo(video.id, {
          durationSec: videoDuration,
        })
      }
    }
    if (fileHandle && !video.posterBlobKey) {
      const { posterBlobKey, durationSec } = await generateAndStoreThumbnail(fileHandle, {
        secondsIntoVideo: Math.min(Math.max(video.progress?.lastPositionSec ?? 3, 2), videoDuration ? Math.max(videoDuration - 1, 2) : 6),
      })
      if (posterBlobKey || durationSec) {
        await updateVideo(video.id, {
          ...(posterBlobKey ? { posterBlobKey } : {}),
          ...(durationSec ? { durationSec } : {}),
        })
        if (posterBlobKey && course && !course.coverBlobKey) {
          await updateCourse(course.id, { coverBlobKey: posterBlobKey })
        }
      }
    }
  }, [video, fileHandle, course])

  const handleTimeUpdate = useCallback(() => {
    const element = videoRef.current
    if (!element || !video) return
    const position = element.currentTime
    const mediaDuration = element.duration
    setCurrentTime(position)
    queueProgressSave(position)
    if (mediaDuration && !hasMarkedCompleteRef.current && shouldMarkCompleted(position, mediaDuration, settings)) {
      void handleMarkCompleted(mediaDuration)
    }
  }, [queueProgressSave, settings, handleMarkCompleted, video])

  const handlePlay = useCallback(() => {
    if (!video || lastPlayReportedRef.current) return
    lastPlayReportedRef.current = true
    const now = new Date().toISOString()
    void updateProgress(video.id, {
      playCount: (video.progress?.playCount ?? 0) + 1,
      firstStartedAt: video.progress?.firstStartedAt ?? now,
      lastPlayedAt: now,
    })
  }, [video])

  const handlePause = useCallback(() => {
    lastPlayReportedRef.current = false
  }, [])

  const handleEnded = useCallback(() => {
    const element = videoRef.current
    if (!element || !video) return
    const mediaDuration = element.duration
    if (!hasMarkedCompleteRef.current && mediaDuration) {
      void handleMarkCompleted(mediaDuration)
    }
  }, [handleMarkCompleted, video])

  const handleRelink = useCallback(
    async (handle: FileSystemFileHandle) => {
      if (!video) return
      await relink(video.id, handle)
      setFileHandle(handle)
      await refreshSource()
    },
    [refreshSource, video],
  )

  if (!course || !video) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-400">
        <p>Video not found. It may have been removed.</p>
        <Link to="/" className="text-sky-400">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const courseProgress = computeCourseProgress(course)
  const completed = isVideoCompleted(video)

  const resumePosition = video.progress?.lastPositionSec ?? 0
  const showResumePrompt = resumePrompt && sourceUrl

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
          <div className="flex flex-col gap-1 text-xs text-slate-400">
            <Link to={`/courses/${course.id}`} className="text-sky-400">
              {course.title}
            </Link>
            <span>Playback position saves locally every few seconds.</span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-900 bg-black">
            {loadingSource && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Loading video…
              </div>
            )}
            {sourceUrl ? (
              <video
                ref={videoRef}
                src={sourceUrl}
                controls
                controlsList="nodownload"
                className="h-full w-full"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
              />
            ) : (
              !loadingSource && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-rose-300">
                  <p>{error ?? 'Select the video file to continue.'}</p>
                  <Button onClick={() => refreshSource()}>Retry</Button>
                </div>
              )
            )}
            {showResumePrompt && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-center">
                  <p className="text-sm text-slate-300">Resume from {formatDuration(Math.floor(resumePosition))}?</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setResumePrompt(false)
                        videoRef.current?.play().catch(() => undefined)
                      }}
                    >
                      Start over
                    </Button>
                    <Button
                      onClick={() => {
                        if (!videoRef.current) return
                        videoRef.current.currentTime = resumePosition
                        setResumePrompt(false)
                        void videoRef.current.play().catch(() => undefined)
                      }}
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-white">{video.title}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>•</span>
                <span>{duration ? formatDuration(Math.floor(duration)) : 'Unknown duration'}</span>
              </div>
            </div>
            <Progress value={completed ? 100 : video.progress && duration ? Math.min(100, (video.progress.lastPositionSec / duration) * 100) : 0} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{completed ? 'Completed' : 'In progress'}</span>
              {video.progress?.playCount ? <span>• {video.progress.playCount} plays</span> : null}
            </div>
          </div>
        </div>

        <VideoNotes videoId={video.id} markdown={video.note?.markdown} />

        {recommendations.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Continue elsewhere</h3>
            <div className="space-y-2 text-xs text-slate-400">
              {recommendations.map((item) => (
                <Link
                  key={item.video.id}
                  to={`/courses/${item.course.id}/watch/${item.video.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-900/60 bg-slate-950/60 px-3 py-2 transition-colors hover:border-slate-800 hover:text-white"
                >
                  <span className="truncate text-white">{item.video.title}</span>
                  <span>{formatDuration(item.video.progress?.lastPositionSec ?? 0)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <CourseOutline course={course} activeVideoId={video.id} />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          <h3 className="text-sm font-semibold text-white">Course progress</h3>
          <p className="mt-2 text-xs text-slate-400">
            {courseProgress.completedVideos} / {courseProgress.totalVideos} videos complete • {courseProgress.percent}%
          </p>
          <Progress value={courseProgress.percent} className="mt-3" />
          <div className="mt-4 grid gap-2 text-xs text-slate-400">
            <span>Total runtime ~ {formatDuration(courseProgress.totalDuration)}</span>
            <span>Watched ~ {formatDuration(courseProgress.estimatedWatchedDuration)}</span>
            <button
              className={buttonClasses({ variant: 'ghost', className: 'mt-2 justify-center text-sky-300 hover:text-sky-200' })}
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              View course overview
            </button>
          </div>
        </div>
      </div>

      <RelinkDialog
        open={relinkOpen}
        onOpenChange={setRelinkOpen}
        videoTitle={video.title}
        onRelink={handleRelink}
      />
    </div>
  )
}
