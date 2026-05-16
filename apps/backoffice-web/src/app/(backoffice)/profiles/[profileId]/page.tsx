"use client";

import { useParams } from "next/navigation";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileDetailView } from "@/components/dashboard/ProfileDetailView";
import { PageHeader } from "@/components/design-system/page-header";

export default function ProfileDetailPage() {
	const { profileId } = useParams<{ profileId: string }>();
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 flex-col gap-4 px-7 pt-6 pb-[60px]">
			<PageHeader
				icon={<User className="h-5 w-5" />}
				title={t("profileDetail.superadminTitle")}
				showBackButton
			/>

			<div className="flex-1 rounded-xl overflow-hidden">
				<ProfileDetailView profileId={profileId} />
			</div>
		</div>
	);
}
