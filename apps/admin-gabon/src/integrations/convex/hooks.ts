export {
	useConvexQuery,
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	usePaginatedConvexQuery,
	useConvexMutationQuery,
	useConvexActionQuery,
	useConvexMutation,
} from "@workspace/api/hooks";

// Legacy aliases used in some files
export {
	useConvexMutationQuery as useAuthenticatedConvexMutation,
	useConvexActionQuery as useConvexAction,
} from "@workspace/api/hooks";
