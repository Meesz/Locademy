/**
 * @file SettingsPage.tsx
 * @description Settings interface for adjusting Locademy's completion thresholds and playback behavior.
 * @author Meesz
 */

import { useEffect, useState } from 'react'
import { useSettings } from '../state/settings-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Slider } from '../components/ui/slider'
import { Switch } from '../components/ui/switch'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { DEFAULT_SETTINGS, MAX_COMPLETION_THRESHOLD, MIN_COMPLETION_THRESHOLD } from '../lib/constants'
import type { AppSettings } from '../lib/types'

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleThresholdChange = (value: number) => {
    const clamped = Math.min(MAX_COMPLETION_THRESHOLD, Math.max(MIN_COMPLETION_THRESHOLD, value / 100))
    setLocalSettings((prev) => ({ ...prev, completionThreshold: clamped }))
    void updateSettings({ completionThreshold: clamped })
  }

  const handleLastSecondsChange = (value: number) => {
    setLocalSettings((prev) => ({ ...prev, lastSecondsWindow: value }))
    void updateSettings({ lastSecondsWindow: value })
  }

  const handleToggle = (checked: boolean) => {
    setLocalSettings((prev) => ({ ...prev, allowLastSecondsComplete: checked }))
    void updateSettings({ allowLastSecondsComplete: checked })
  }

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS)
    void updateSettings(DEFAULT_SETTINGS)
  }

  const thresholdPercent = Math.round(localSettings.completionThreshold * 100)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Playback completion</CardTitle>
          <CardDescription>
            Decide when Locademy marks a video as completed. Threshold applies to future playback sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm text-slate-200">
              <span>Completion threshold</span>
              <span className="text-xs text-slate-400">{thresholdPercent}% of video watched</span>
            </label>
            <Slider
              min={MIN_COMPLETION_THRESHOLD * 100}
              max={MAX_COMPLETION_THRESHOLD * 100}
              step={1}
              value={thresholdPercent}
              onChange={(event) => handleThresholdChange(Number(event.currentTarget.value))}
            />
            <p className="text-xs text-slate-500">
              Videos are marked completed when the watched percentage reaches {thresholdPercent}%.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm font-medium text-white">Count final seconds as complete</p>
              <p className="text-xs text-slate-400">
                When enabled, finishing the last few seconds also marks the video completed.
              </p>
            </div>
            <Switch checked={localSettings.allowLastSecondsComplete} onCheckedChange={handleToggle} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm text-slate-200">
              <span>Final seconds window</span>
              <span className="text-xs text-slate-400">{localSettings.lastSecondsWindow}s</span>
            </label>
            <Input
              type="number"
              min={5}
              max={120}
              value={localSettings.lastSecondsWindow}
              onChange={(event) => handleLastSecondsChange(Number(event.target.value))}
            />
            <p className="text-xs text-slate-500">
              If the remaining duration is at or below this value and the toggle is on, completion counts instantly.
            </p>
          </div>

          <Button variant="outline" onClick={handleReset}>
            Reset to defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
