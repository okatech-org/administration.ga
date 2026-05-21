"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { User } from "lucide-react";
import { useState } from "react";
import { ProfileViewSheet } from "@/components/dashboard/ProfileViewSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

interface UserProfilePreviewCardProps {
	userId: Id<"users">;
}

/**
 * Self-contained component that displays a user profile preview card
 * Fetches profile data internally and handles the sheet modal
 */
export function UserProfilePreviewCard({
	userId,
}: UserProfilePreviewCardProps) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const { data: profile } = useAuthenticatedConvexQuery(
		api.functions.profiles.getByUserId,
		{ userId },
	);

	// Loading state
	if (profile === undefined) {
		return (
			<FlatCard className="overflow-hidden">
				<div className="p-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 flex-1">
						<Skeleton className="h-9 w-9 rounded-full shrink-0" />
						<Skeleton className="h-4 w-32" />
					</div>
					<Skeleton className="h-8 w-24 shrink-0" />
				</div>
			</FlatCard>
		);
	}

	// No profile state
	if (!profile) {
		return (
			<FlatCard className="overflow-hidden">
				<div className="bg-muted/20 p-3 flex items-center gap-3">
					<div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
						<User className="h-4 w-4 text-muted-foreground/50" />
					</div>
					<p className="text-sm text-muted-foreground">Profil non renseigné</p>
				</div>
			</FlatCard>
		);
	}

	const initials =
		(profile.identity?.firstName?.[0] || "") +
		(profile.identity?.lastName?.[0] || "");
	const fullName =
		[profile.identity?.firstName, profile.identity?.lastName]
			.filter(Boolean)
			.join(" ") || "Nom inconnu";

	return (
		<>
			<FlatCard className="overflow-hidden py-0">
				<div className="p-3 flex flex-row items-center justify-between gap-3">
					<div className="flex flex-row items-center gap-3 min-w-0">
						<Avatar className="h-9 w-9 border shadow-sm">
							<AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
								{initials || "?"}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<h3 className="font-semibold text-sm truncate">{fullName}</h3>
						</div>
					</div>
					<Button
						variant="secondary"
						size="sm"
						className="shrink-0 text-xs h-8"
						onClick={() => setSheetOpen(true)}
					>
						Voir le profil
					</Button>
				</div>
			</FlatCard>

			{profile && (
				<ProfileViewSheet
					profileId={profile._id}
					open={sheetOpen}
					onOpenChange={setSheetOpen}
				/>
			)}
		</>
	);
}
