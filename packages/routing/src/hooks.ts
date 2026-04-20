"use client"

import { useRouterImplementation } from "./provider"
import type { RouterApi } from "./types"

export function useRouter(): RouterApi {
  return useRouterImplementation().useRouter()
}

export function usePathname(): string {
  return useRouterImplementation().usePathname()
}

export function useSearchParams(): URLSearchParams {
  return useRouterImplementation().useSearchParams()
}

export function useParams<T extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>>(): T {
  return useRouterImplementation().useParams() as T
}
