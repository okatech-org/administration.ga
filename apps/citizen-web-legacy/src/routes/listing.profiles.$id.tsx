import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/listing/profiles/$id")({
	component: LegacyProfileRedirectPage,
});

function LegacyProfileRedirectPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const newProfileId = useConvexQuery(
		api.functions.profiles.getProfilIdFromPublicId,
		{
			publicId: id,
		},
	);

	useEffect(() => {
		if (newProfileId !== undefined) {
			if (newProfileId) {
				navigate({
					to: "/verify-profile/$profileId",
					params: { profileId: newProfileId },
					replace: true,
				});
			} else {
				navigate({
					to: "/verify-profile/$profileId",
					params: { profileId: "invalid" },
					replace: true,
				});
			}
		}
	}, [newProfileId, navigate]);

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="flex flex-col items-center">
				<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
				<p className="mt-4 text-muted-foreground">Recherche du profil...</p>
			</div>
		</div>
	);
}
