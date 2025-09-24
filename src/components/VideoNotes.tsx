import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Textarea } from './ui/textarea'
import { upsertNote } from '../services/notes-service'

interface VideoNotesProps {
  videoId: string
  markdown?: string
}

export function VideoNotes({ videoId, markdown }: VideoNotesProps) {
  const [value, setValue] = useState(markdown ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(markdown ?? '')
  }, [markdown])

  useEffect(() => {
    let cancelled = false
    setSaving(true)
    const timeout = setTimeout(() => {
      upsertNote(videoId, value).finally(() => {
        if (!cancelled) {
          setSaving(false)
        }
      })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [videoId, value])

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Notes</h3>
          <span className="text-xs text-slate-500">{saving ? 'Saving…' : 'Autosaved'}</span>
        </div>
        <p className="text-xs text-slate-500">Markdown supported.</p>
      </div>
      <Textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Write notes for yourself…" />
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 text-sm text-slate-200">
        <div className="prose prose-invert max-w-none text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || '*Start typing to add notes.*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
