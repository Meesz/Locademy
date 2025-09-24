import { useEffect, useState, type ReactElement } from "react";
import { Textarea } from "./ui/textarea";
import { upsertNote } from "../services/notes-service";

interface VideoNotesProps {
  videoId: string;
  markdown?: string;
}

export function VideoNotes({ videoId, markdown }: VideoNotesProps) {
  const [value, setValue] = useState(markdown ?? "");
  const [saving, setSaving] = useState(false);
  // Lazy loaded markdown renderer (to avoid pulling heavy deps into main chunk)
  const [MarkdownRenderer, setMarkdownRenderer] = useState<
    null | ((props: { children: string }) => ReactElement)
  >(null);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    setValue(markdown ?? "");
  }, [markdown]);

  useEffect(() => {
    let cancelled = false;
    setSaving(true);
    const timeout = setTimeout(() => {
      upsertNote(videoId, value).finally(() => {
        if (!cancelled) {
          setSaving(false);
        }
      });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [videoId, value]);

  // Dynamically import markdown libraries only after mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ default: ReactMarkdown }, gfm] = await Promise.all([
          import("react-markdown"),
          import("remark-gfm"),
        ]);
        if (!active) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal dynamic plugin typing to avoid pulling in 'unified' types
        const plugin = (gfm as any).default ?? gfm;
        setMarkdownRenderer(() => (props: { children: string }) => (
          <ReactMarkdown remarkPlugins={[plugin]}>
            {props.children}
          </ReactMarkdown>
        ));
        setPreviewReady(true);
      } catch (err) {
        // Fail silently; preview just won't render
        console.error("Failed to load markdown preview libs", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Notes</h3>
          <span className="text-xs text-slate-500">
            {saving ? "Saving…" : "Autosaved"}
          </span>
        </div>
        <p className="text-xs text-slate-500">Markdown supported.</p>
      </div>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write notes for yourself…"
      />
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-sm text-slate-200">
        <div className="prose prose-invert max-w-none text-sm">
          {MarkdownRenderer ? (
            <MarkdownRenderer>
              {value || "*Start typing to add notes.*"}
            </MarkdownRenderer>
          ) : (
            <em className="text-slate-500">
              {previewReady ? "Loading preview…" : "Loading preview…"}
            </em>
          )}
        </div>
      </div>
    </div>
  );
}
