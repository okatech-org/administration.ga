// Re-export from the shared package so every app instance reads the same
// ConsularThemeContext (and migrated pages in @workspace/agent-features pick
// up the value set by App.tsx).
export {
  useConsularTheme,
  useConsularThemeState,
  ConsularThemeContext,
  type ConsularTheme,
} from "@workspace/agent-features/hooks"
