"use client"

import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import {
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import {
  type PaginatedQueryReference,
  useAction,
  useConvexAuth,
  usePaginatedQuery,
} from "convex/react"
import type { FunctionReference, FunctionReturnType } from "convex/server"

export { convexQuery, useConvexMutation }

export function usePaginatedConvexQuery<Query extends PaginatedQueryReference>(
  query: Query,
  args: Record<string, unknown> | "skip",
  options: { initialNumItems: number },
) {
  const shouldSkip = args === "skip"
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    query,
    shouldSkip ? "skip" : (args as any),
    options,
  )
  return { results, status, loadMore, isLoading }
}

export function useAuthenticatedPaginatedQuery<
  Query extends PaginatedQueryReference,
>(
  query: Query,
  args: Record<string, unknown> | "skip",
  options: { initialNumItems: number },
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const shouldSkip = args === "skip" || !isAuthenticated || isAuthLoading
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    query,
    shouldSkip ? "skip" : (args as any),
    options,
  )
  return { results, status, loadMore, isLoading: isLoading || isAuthLoading }
}

export function useConvexQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"] | "skip",
): UseQueryResult<FunctionReturnType<Query>> {
  const shouldSkip = args === "skip"
  const queryOptions = shouldSkip
    ? { queryKey: ["convexQuery", query, "skip"] as const }
    : convexQuery(query, args)
  return useQuery({
    ...queryOptions,
    enabled: !shouldSkip,
  } as any)
}

export function useAuthenticatedConvexQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: Query["_args"] | "skip",
): UseQueryResult<FunctionReturnType<Query>> {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const shouldSkip = args === "skip" || !isAuthenticated || isLoading
  const queryOptions = shouldSkip
    ? { queryKey: ["convexQuery", query, "skip"] as const }
    : convexQuery(query, args)
  return useQuery({
    ...queryOptions,
    enabled: !shouldSkip,
  } as any)
}

export function useConvexMutationQuery<
  Mutation extends FunctionReference<"mutation">,
>(mutation: Mutation) {
  const mutationFn = useConvexMutation(mutation)
  return useMutation({
    mutationFn: async (args: Mutation["_args"]) => {
      return await mutationFn(args)
    },
  })
}

export { useConvexMutationQuery as useAuthenticatedConvexMutation }

export function useConvexActionQuery<
  Action extends FunctionReference<"action">,
>(action: Action) {
  const actionFn = useAction(action)
  return useMutation({
    mutationFn: async (args: Action["_args"]) => {
      return await actionFn(args)
    },
  })
}

export { useConvexActionQuery as useConvexAction }
