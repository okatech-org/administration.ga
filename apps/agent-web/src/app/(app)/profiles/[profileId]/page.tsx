"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ProfileDetailView } from "@/components/dashboard/ProfileDetailView";
import { Button } from "@/components/ui/button";

export default function AdminProfileDetailPage() {
	const { profileId } = useParams<{ profileId: string }>();
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					size="icon"
					onClick={() => router.back()}
					className="shrink-0"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						{t("profileDetail.title")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("profileDetail.description")}
					</p>
				</div>
			</div>

			<div className="flex-1 rounded-xl overflow-hidden">
				<ProfileDetailView profileId={profileId} />
			</div>
		</div>
	);
}
