import { dialog, type BrowserWindow } from "electron"
import { writeFile, readFile } from "fs/promises"
import type {
  SaveDialogOptions,
  SaveDialogResult,
  OpenDialogOptions,
  OpenDialogResult,
} from "@workspace/desktop-shared/file-dialog-types"

export class FileDialogService {
  constructor(private getWindow: () => BrowserWindow | null) {}

  async saveWithDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    const win = this.getWindow()
    const result = await dialog.showSaveDialog(win ?? {}, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    const buffer =
      typeof options.data === "string"
        ? Buffer.from(options.data, "utf-8")
        : Buffer.from(options.data)

    await writeFile(result.filePath, buffer)
    return { canceled: false, filePath: result.filePath }
  }

  async openWithDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    const win = this.getWindow()
    const properties: Array<"openFile" | "multiSelections" | "openDirectory"> = []

    if (options.directory) {
      properties.push("openDirectory")
    } else {
      properties.push("openFile")
    }
    if (options.multiple) {
      properties.push("multiSelections")
    }

    const result = await dialog.showOpenDialog(win ?? {}, {
      title: options.title,
      filters: options.filters,
      properties,
    })

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    }
  }

  async readFileContents(filePath: string): Promise<ArrayBuffer> {
    const buffer = await readFile(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
}
