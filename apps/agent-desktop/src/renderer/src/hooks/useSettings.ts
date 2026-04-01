import { useState, useCallback } from "react"

const SETTINGS_KEY = "diplomate-desktop-settings"

export interface DesktopSettings {
  defaultDuplex: boolean
  defaultPriority: "normal" | "high" | "urgent"
  autoStartPrint: boolean
}

const DEFAULT_SETTINGS: DesktopSettings = {
  defaultDuplex: true,
  defaultPriority: "normal",
  autoStartPrint: false,
}

function loadSettings(): DesktopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export function useSettings() {
  const [settings, setSettingsState] = useState<DesktopSettings>(loadSettings)

  const updateSettings = useCallback((partial: Partial<DesktopSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS)
    try { localStorage.removeItem(SETTINGS_KEY) } catch { /* ignore */ }
  }, [])

  return { settings, updateSettings, resetSettings }
}
