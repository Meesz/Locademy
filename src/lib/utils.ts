import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDuration(seconds: number | undefined) {
  if (!seconds || Number.isNaN(seconds)) {
    return '0:00'
  }
  const total = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (val: number) => val.toString().padStart(2, '0')
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`
  }
  return `${mins}:${pad(secs)}`
}

export function formatRelativeDate(date?: Date | string | null) {
  if (!date) return ''
  const dt = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(dt.getTime())) return ''
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  })
  const diff = dt.getTime() - Date.now()
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute')
  }
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour')
  }
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) {
    return formatter.format(days, 'day')
  }
  const months = Math.round(days / 30)
  if (Math.abs(months) < 12) {
    return formatter.format(months, 'month')
  }
  const years = Math.round(months / 12)
  return formatter.format(years, 'year')
}

export function createId() {
  return crypto.randomUUID()
}

export function humanizeName(raw: string) {
  return raw
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim()
}
