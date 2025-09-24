import { liveQuery } from 'dexie'
import { db, type SettingEntity } from '../lib/db'
import { DEFAULT_SETTINGS } from '../lib/constants'
import type { AppSettings } from '../lib/types'

const SETTINGS_KEY = 'app-settings'

type SettingsRecord = SettingEntity<AppSettings>

export async function getSettings(): Promise<AppSettings> {
  const stored = (await db.settings.get(SETTINGS_KEY)) as SettingsRecord | undefined
  return { ...DEFAULT_SETTINGS, ...(stored?.value ?? {}) }
}

export async function setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next: AppSettings = {
    ...current,
    ...patch,
  }
  await db.settings.put({ key: SETTINGS_KEY, value: next })
  return next
}

export function settingsLiveQuery() {
  return liveQuery(async () => getSettings())
}
