"use client";

import { api } from "@convex/_generated/api";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

/**
 * This route acts as a redirect:
 * 1. Fetches the service by slug
 * 2. Checks for an existing draft
 * 3. Creates a new draft if none exists
 * 4. Redirects to /my-space/requests/[id] for editing
 */
export default function NewRequestRedirect() {
	const params = useParams<{ slug: string }>();
	const slug = params.slug;
	const router = useRouter();
	const searchParams = useSearchParams();
	const childId = searchParams.get("childId") || undefined;
	const orgSlug = searchParams.get("org") || undefined;
	const { t } = useTranslation();

	const [error, setError] = useState<string | null>(null);
	const creatingDraft = useRef(false);

	// Fetch service by slug. When the citizen arrives from a partner site
	// (e.g. france.consulat.ga) the `org` query param pins the request to
	// the exact consulate the user was looking at.
	const { data: orgService } = useAuthenticatedConvexQuery(
		api.functions.services.getOrgServiceBySlug,
		{
			slug,
			orgSlug,
		},
	);

	// Check for existing draft
	const { data: existingDraft } = useAuthenticatedConvexQuery(
		api.functions.requests.getDraftForService,
		orgService
			? { orgServiceId: orgService._id, childProfileId: childId as any }
			: "skip",
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

			// Deep-linked from a partner site but the consulate deactivated
			// this service: surface that explicitly instead of creating a
			// draft on an inactive orgService.
			if (orgSlug && !orgService.isActive) {
				setError(t("services.notAvailableAtOrg"));
				return;
			}

			// Wait for existingDraft query to complete
			if (existingDraft === undefined) return;

			// If we have an existing draft, redirect to it
			if (existingDraft) {
				router.replace(`/my-space/requests/${existingDraft.reference}`);
				return;
			}

			// No existing draft, create one (only once)
			if (!creatingDraft.current) {
				creatingDraft.current = true;
				try {
					const result = await createDraft({
						orgServiceId: orgService._id,
						submitNow: false,
						childProfileId: childId as any,
					});
					captureEvent("myspace_request_started", {
						request_type: slug,
					});
					const ref = (result as { reference: string }).reference;
					router.replace(`/my-space/requests/${ref}`);
				} catch (err) {
					console.error("Failed to create draft:", err);
					setError(t("error.createDraft"));
				}
			}
		}
		handleRedirect();
	}, [orgService, existingDraft, createDraft, router, t, orgSlug]);

	// Error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-8 text-center">
				<h2 className="text-xl font-semibold mb-2">{error}</h2>
				<p className="text-muted-foreground mb-4">
					{t("services.notFoundDesc")}
				</p>
				<Button onClick={() => router.push("/my-space/services")}>
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
