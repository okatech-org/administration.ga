import { app, screen } from "electron"
import { readFileSync, writeFileSync } from "fs"
import path from "path"

export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800,
  isMaximized: false,
}

export class WindowStateService {
  private filePath: string
  private state: WindowState = { ...DEFAULT_STATE }

  constructor() {
    this.filePath = path.join(app.getPath("userData"), "window-state.json")
  }

  load(): WindowState {
    try {
      const raw = readFileSync(this.filePath, "utf-8")
      const saved = JSON.parse(raw) as WindowState
      // Validate bounds are on a visible display
      if (this.isOnScreen(saved)) {
        this.state = saved
      }
    } catch {
      // First launch or corrupted file — use defaults
    }
    return this.state
  }

  save(state: WindowState): void {
    this.state = state
    try {
      writeFileSync(this.filePath, JSON.stringify(state), "utf-8")
    } catch {
      // Ignore write errors on shutdown
    }
  }

  private isOnScreen(state: WindowState): boolean {
    const displays = screen.getAllDisplays()
    return displays.some((display) => {
      const { x, y, width, height } = display.bounds
      // At least part of the window must be visible
      return (
        state.x < x + width &&
        state.x + state.width > x &&
        state.y < y + height &&
        state.y + state.height > y
      )
    })
  }
}
