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

  // Auth (future)
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_TOKEN: "auth:get-token",
} as const
