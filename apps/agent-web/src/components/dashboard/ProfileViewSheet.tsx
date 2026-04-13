"use client";

import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { ProfileDetailView } from "./ProfileDetailView";

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
	const { t } = useTranslation();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full md:max-w-4xl! p-0 flex flex-col bg-background">
				<SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0 bg-muted/20 relative z-30">
					<SheetTitle className="text-lg">
						{t("profile.profileDetails")}
					</SheetTitle>
					<Button variant="outline" size="sm" asChild className="mr-6">
						<Link href={`/admin/profiles/${profileId}` as any}>
							Dossier complet
						</Link>
					</Button>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
					{profileId ? (
						<ProfileDetailView profileId={profileId} />
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
							<User className="h-16 w-16 mb-4 opacity-20" />
							<p className="text-lg font-medium">{t("common.error")}</p>
							<p className="text-sm mt-1">{t("settings.notFound")}</p>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
