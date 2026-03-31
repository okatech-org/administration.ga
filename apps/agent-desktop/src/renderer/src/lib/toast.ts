/**
 * Simple toast notification system for the desktop app.
 * Lightweight alternative to sonner/react-hot-toast.
 */

type ToastType = "success" | "error" | "info"

function showToast(message: string, type: ToastType = "info") {
  const container = document.getElementById("toast-container") ?? createContainer()
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.textContent = message

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
  })

  // Remove after 3s
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(-8px)"
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function createContainer(): HTMLDivElement {
  const container = document.createElement("div")
  container.id = "toast-container"
  container.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 9999;
    display: flex; flex-direction: column; gap: 8px;
    pointer-events: none;
  `
  document.body.appendChild(container)

  // Inject styles
  const style = document.createElement("style")
  style.textContent = `
    .toast {
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      color: white;
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: auto;
      max-width: 320px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toast-success { background: #009639; }
    .toast-error { background: #ef4444; }
    .toast-info { background: #3A75C4; }
  `
  document.head.appendChild(style)

  return container
}

export const toast = {
  success: (msg: string) => showToast(msg, "success"),
  error: (msg: string) => showToast(msg, "error"),
  info: (msg: string) => showToast(msg, "info"),
}
