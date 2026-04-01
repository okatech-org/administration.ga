/**
 * Types for native file save/open dialogs.
 */

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  /** File content as string (text) or ArrayBuffer (binary) */
  data: string | ArrayBuffer
}

export interface SaveDialogResult {
  canceled: boolean
  filePath?: string
}

export interface OpenDialogOptions {
  title?: string
  filters?: FileFilter[]
  multiple?: boolean
  directory?: boolean
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}
