import { contextBridge, ipcRenderer } from "electron"

const printerApi = {
  listDevices: () => ipcRenderer.invoke("printer:list-devices"),
  connect: (name: string) => ipcRenderer.invoke("printer:connect", name),
  disconnect: () => ipcRenderer.invoke("printer:disconnect"),
  getStatus: () => ipcRenderer.invoke("printer:get-status"),
  print: (options: {
    frontImagePath: string
    backImagePath?: string
    duplex?: boolean
  }) => ipcRenderer.invoke("printer:print", options),
}

contextBridge.exposeInMainWorld("desktopApi", {
  printer: printerApi,
})

export type DesktopApi = {
  printer: typeof printerApi
}
