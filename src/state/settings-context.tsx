/**
 * @file settings-context.tsx
 * @description React context for accessing and mutating application settings with live Dexie-backed updates.
 * @author Meesz
 */

import { useCallback, useMemo, type PropsWithChildren } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { AppSettings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { getSettings, setSettings } from "../services/settings-service";
import { SettingsContext } from "./settings-context-classes";
import type { SettingsContextValue } from "./settings-context-classes";

export function SettingsProvider({ children }: PropsWithChildren) {
  const liveSettings = useLiveQuery(async () => getSettings(), []);
  const settings = liveSettings ?? DEFAULT_SETTINGS;

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    return setSettings(patch);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings,
    }),
    [settings, updateSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
