"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { RouterImplementation } from "./types"

const RouterImplementationContext = createContext<RouterImplementation | null>(null)

export function RouterProvider({
  implementation,
  children,
}: {
  implementation: RouterImplementation
  children: ReactNode
}) {
  return (
    <RouterImplementationContext.Provider value={implementation}>
      {children}
    </RouterImplementationContext.Provider>
  )
}

export function useRouterImplementation(): RouterImplementation {
  const impl = useContext(RouterImplementationContext)
  if (!impl) {
    throw new Error(
      "@workspace/routing: No RouterProvider found. Wrap your app with <RouterProvider implementation={...}>.",
    )
  }
  return impl
}
