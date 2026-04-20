"use client"

import { useRouterImplementation } from "./provider"
import type { LinkProps } from "./types"

export function Link(props: LinkProps) {
  const { LinkComponent } = useRouterImplementation()
  return <LinkComponent {...props} />
}
