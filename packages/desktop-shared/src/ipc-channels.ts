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

  // System (future)
  SYSTEM_NOTIFY: "system:notify",
  SYSTEM_CHECK_UPDATE: "system:check-update",
  SYSTEM_INSTALL_UPDATE: "system:install-update",

  // Auth (future)
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_GET_TOKEN: "auth:get-token",
} as const
