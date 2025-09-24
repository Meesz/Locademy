import { Link } from "react-router";
import type { VideoWithRelations } from "../lib/types";
import { formatDuration } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface VideoRowProps {
  courseId: string;
  video: VideoWithRelations;
  index: number;
}

export function VideoRow({ courseId, video, index }: VideoRowProps) {
  const { progress } = video;
  const completed = progress?.completed ?? false;
  const progressPercent = completed
    ? 100
    : progress && video.durationSec
    ? Math.min(
        100,
        Math.round((progress.lastPositionSec / video.durationSec) * 100)
      )
    : 0;

  return (
    <Link
      to={`/courses/${courseId}/watch/${video.id}`}
      className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 transition-colors hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 text-xs text-slate-500">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="text-sm font-medium text-white">{video.title}</p>
            <p className="text-xs text-slate-400">
              {video.durationSec
                ? formatDuration(video.durationSec)
                : "Unknown duration"}
            </p>
          </div>
        </div>
        {completed ? (
          <Badge variant="success">Completed</Badge>
        ) : (
          progress &&
          progress.lastPositionSec > 0 && (
            <Badge variant="outline">Resume</Badge>
          )
        )}
      </div>
      <Progress value={progressPercent} />
    </Link>
  );
}
