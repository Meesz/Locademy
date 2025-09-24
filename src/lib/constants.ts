/**
 * @file constants.ts
 * @description Centralized configuration constants governing Locademy's playback and progress behaviour.
 * @author Meesz
 */

import type { AppSettings } from './types'

export const DEFAULT_COMPLETION_THRESHOLD = 0.9
export const MIN_COMPLETION_THRESHOLD = 0.8
export const MAX_COMPLETION_THRESHOLD = 1
export const DEFAULT_LAST_SECONDS_WINDOW = 30
export const RESUME_THRESHOLD_SECONDS = 5
export const PROGRESS_SAVE_DEBOUNCE_MS = 2000

export const DEFAULT_SETTINGS: AppSettings = {
  completionThreshold: DEFAULT_COMPLETION_THRESHOLD,
  allowLastSecondsComplete: true,
  lastSecondsWindow: DEFAULT_LAST_SECONDS_WINDOW,
}
