/**
 * Re-export hooks from @workspace/api so desktop pages can use
 * the same data-fetching patterns as agent-web.
 */
export {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
  useConvexActionQuery,
  useAuthenticatedPaginatedQuery,
  usePaginatedConvexQuery,
} from "@workspace/api/hooks"
