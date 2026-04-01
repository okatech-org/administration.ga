import { Menu, type IpcMain, type BrowserWindow } from "electron"

export function registerMenuIpc(
  _ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  const sendAction = (action: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("menu:action", action)
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Diplomate.ga",
      submenu: [
        { role: "about", label: "A propos de Diplomate.ga" },
        { type: "separator" },
        {
          label: "Preferences...",
          accelerator: "CmdOrCtrl+,",
          click: () => sendAction("navigate:settings"),
        },
        { type: "separator" },
        { role: "hide", label: "Masquer" },
        { role: "hideOthers", label: "Masquer les autres" },
        { role: "unhide", label: "Tout afficher" },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Fichier",
      submenu: [
        {
          label: "Nouveau courrier",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("navigate:iboite"),
        },
        {
          label: "Imprimer",
          accelerator: "CmdOrCtrl+P",
          click: () => sendAction("navigate:impression"),
        },
        { type: "separator" },
        { role: "close", label: "Fermer la fenetre" },
      ],
    },
    {
      label: "Edition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Retablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
        { role: "selectAll", label: "Tout selectionner" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Recharger" },
        { role: "forceReload", label: "Forcer le rechargement" },
        { role: "toggleDevTools", label: "Outils de developpement" },
        { type: "separator" },
        { role: "resetZoom", label: "Taille reelle" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arriere" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein ecran" },
      ],
    },
    {
      label: "Navigation",
      submenu: [
        {
          label: "Tableau de bord",
          accelerator: "CmdOrCtrl+1",
          click: () => sendAction("navigate:dashboard"),
        },
        {
          label: "Boite de reception",
          accelerator: "CmdOrCtrl+2",
          click: () => sendAction("navigate:iboite"),
        },
        {
          label: "Correspondance",
          accelerator: "CmdOrCtrl+3",
          click: () => sendAction("navigate:icorrespondance"),
        },
        {
          label: "Documents",
          accelerator: "CmdOrCtrl+4",
          click: () => sendAction("navigate:idocument"),
        },
        {
          label: "Agenda",
          accelerator: "CmdOrCtrl+5",
          click: () => sendAction("navigate:iagenda"),
        },
      ],
    },
    {
      label: "Fenetre",
      submenu: [
        { role: "minimize", label: "Reduire" },
        { role: "zoom", label: "Zoom" },
        { type: "separator" },
        { role: "front", label: "Tout ramener au premier plan" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            const { shell } = require("electron")
            shell.openExternal("https://diplomate.ga/docs")
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
