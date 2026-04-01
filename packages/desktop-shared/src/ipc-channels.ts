/**
 * IPC channel names used between main process and renderer.
 * Defined here for type safety and single source of truth.
 */
export const IPC_CHANNELS = {
  // Printer
  PRINTER_LIST_DEVICES: "printer:list-devices",
  PRINTER_CONNECT: "printer:connect",
  PRINTER_DISCONNECT: "printer:disconnect",
  PRINTER_GET_STATUS: "printer:get-status",
  PRINTER_PRINT: "printer:print",

  // Notifications
  SYSTEM_NOTIFY: "system:notify",
  SYSTEM_NOTIFY_GET_PREFS: "system:notify:get-prefs",
  SYSTEM_NOTIFY_SET_PREFS: "system:notify:set-prefs",
  SYSTEM_NOTIFY_ON_CLICK: "system:notify:on-click",
  SYSTEM_BADGE_SET_COUNT: "system:badge:set-count",

  // File dialogs
  FILE_SAVE_DIALOG: "file:save-dialog",
  FILE_OPEN_DIALOG: "file:open-dialog",

  // System updates (future)
  SYSTEM_CHECK_UPDATE: "system:check-update",
  SYSTEM_INSTALL_UPDATE: "system:install-update",
  SYSTEM_UPDATE_STATUS: "system:update-status",

  // Clipboard
  CLIPBOARD_WRITE_TEXT: "clipboard:write-text",
  CLIPBOARD_READ_TEXT: "clipboard:read-text",
  CLIPBOARD_WRITE_IMAGE: "clipboard:write-image",
  CLIPBOARD_READ_IMAGE: "clipboard:read-image",

  // Tray
  TRAY_UPDATE_BADGE: "tray:update-badge",
  TRAY_UPDATE_STATUS: "tray:update-status",
  TRAY_ACTION: "tray:action",

  // Menu
  MENU_ACTION: "menu:action",

  // Window controls
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE_TOGGLE: "window:maximize-toggle",
  WINDOW_CLOSE: "window:close",
  WINDOW_IS_MAXIMIZED: "window:is-maximized",
  WINDOW_GET_PLATFORM: "window:get-platform",
  WINDOW_MAXIMIZED_CHANGED: "window:maximized-changed",

  // Progress bar
  SYSTEM_SET_PROGRESS: "system:set-progress",

  // Spell check
  SYSTEM_SET_SPELL_CHECK: "system:set-spell-check",
  SYSTEM_GET_SPELL_CHECK: "system:get-spell-check",

  // Context menu
  CONTEXT_MENU_SHOW: "context-menu:show",

  // Theme
  SYSTEM_THEME_CHANGED: "system:theme-changed",

  // Auth (future)
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_TOKEN: "auth:get-token",
} as const
