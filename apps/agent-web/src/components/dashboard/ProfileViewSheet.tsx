"use client";

import type { Id } from "@convex/_generated/dataModel";

import { ProfilePreviewSheet } from "./profile/profile-preview-sheet";

interface ProfileViewSheetProps {
	profileId: string | Id<"profiles"> | Id<"childProfiles">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ProfileViewSheet({
	profileId,
	open,
	onOpenChange,
}: ProfileViewSheetProps) {
	return (
		<ProfilePreviewSheet
			profileId={profileId}
			open={open}
			onOpenChange={onOpenChange}
		/>
	);
}
