"use client";

import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

export const Route = createFileRoute("/my-space/services/$slug/new")({
	component: NewRequestRedirect,
});

/**
 * This route acts as a redirect:
 * 1. Fetches the service by slug
 * 2. Checks for an existing draft
 * 3. Creates a new draft if none exists
 * 4. Redirects to /my-space/requests/[id] for editing
 */
function NewRequestRedirect() {
	const { slug } = Route.useParams();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const [error, setError] = useState<string | null>(null);
	const creatingDraft = useRef(false);

	// Fetch service by slug
	const { data: orgService } = useAuthenticatedConvexQuery(
		api.functions.services.getOrgServiceBySlug,
		{
			slug,
		},
	);

	// Check for existing draft
	const { data: existingDraft } = useAuthenticatedConvexQuery(
		api.functions.requests.getDraftForService,
		orgService ? { orgServiceId: orgService._id } : "skip",
	);

	const { mutateAsync: createDraft } = useConvexMutationQuery(
		api.functions.requests.create,
	);

	// Redirect logic
	useEffect(() => {
		async function handleRedirect() {
			// Wait for queries to complete
			if (orgService === undefined) return;

			// Service not found
			if (orgService === null) {
				setError(t("services.notFound"));
				return;
			}

			// Wait for existingDraft query to complete
			if (existingDraft === undefined) return;

			// If we have an existing draft, redirect to it
			if (existingDraft) {
				navigate({
					to: `/my-space/requests/${existingDraft.reference}`,
					replace: true,
				});
				return;
			}

			// No existing draft, create one (only once)
			if (!creatingDraft.current) {
				creatingDraft.current = true;
				try {
					const result = await createDraft({
						orgServiceId: orgService._id,
						submitNow: false,
					});
					captureEvent("myspace_request_started", {
						request_type: orgService.slug,
					});
					const ref = (result as { reference: string }).reference;
					navigate({ to: `/my-space/requests/${ref}`, replace: true });
				} catch (err) {
					console.error("Failed to create draft:", err);
					setError(t("error.createDraft"));
				}
			}
		}
		handleRedirect();
	}, [orgService, existingDraft, createDraft, navigate, t]);

	// Error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8 text-center">
				<h2 className="text-xl font-semibold mb-2">{error}</h2>
				<p className="text-muted-foreground mb-4">
					{t("services.notFoundDesc")}
				</p>
				<Button onClick={() => navigate({ to: "/my-space/services" })}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("common.backToServices")}
				</Button>
			</div>
		);
	}

	// Loading state (while redirecting)
	return (
		<div className="flex flex-col items-center justify-center h-full gap-4">
			<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			<p className="text-muted-foreground">{t("requests.preparingDraft")}</p>
		</div>
	);
}
