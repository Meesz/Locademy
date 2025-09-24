import { createContext, useContext } from "react";
import type { AppSettings } from "../lib/types";

export interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("SettingsProvider missing");
  return ctx;
}
