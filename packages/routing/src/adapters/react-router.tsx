"use client"

import {
  Link as RRLink,
  useLocation,
  useNavigate,
  useParams as useRRParams,
  useSearchParams as useRRSearchParams,
} from "react-router-dom"
import { useMemo, type ReactNode } from "react"
import { RouterProvider } from "../provider"
import type { LinkProps, RouterApi, RouterImplementation } from "../types"

function ReactRouterLink(props: LinkProps) {
  const { href, prefetch: _prefetch, children, ...rest } = props
  const isExternal = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)
  if (isExternal) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <RRLink to={href} {...rest}>
      {children}
    </RRLink>
  )
}

function useReactRouterApi(): RouterApi {
  const navigate = useNavigate()
  return useMemo<RouterApi>(
    () => ({
      push: (href, options) => {
        navigate(href, { replace: options?.replace ?? false, preventScrollReset: options?.scroll === false })
      },
      replace: (href, options) => {
        navigate(href, { replace: true, preventScrollReset: options?.scroll === false })
      },
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => {
        if (typeof window !== "undefined") window.location.reload()
      },
      prefetch: () => {
        /* no-op in SPA */
      },
    }),
    [navigate],
  )
}

function useReactRouterSearchParamsAdapter(): URLSearchParams {
  const [params] = useRRSearchParams()
  return useMemo(() => new URLSearchParams(params.toString()), [params])
}

const reactRouterImplementation: RouterImplementation = {
  useRouter: useReactRouterApi,
  usePathname: () => useLocation().pathname,
  useSearchParams: useReactRouterSearchParamsAdapter,
  useParams: () => useRRParams() as Record<string, string | string[] | undefined>,
  LinkComponent: ReactRouterLink,
}

export function ReactRouterAdapter({ children }: { children: ReactNode }) {
  return <RouterProvider implementation={reactRouterImplementation}>{children}</RouterProvider>
}
