import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileDetailView } from "@/components/dashboard/ProfileDetailView";
import { PageHeader } from "@/components/design-system/page-header";

export const Route = createFileRoute("/_app/profiles/$profileId")({
	component: ProfileDetailPage,
});

function ProfileDetailPage() {
	const { profileId } = Route.useParams();
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 flex-col gap-4 p-3 md:p-4">
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
