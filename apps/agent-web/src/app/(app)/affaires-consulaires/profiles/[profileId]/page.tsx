"use client";

import { ProfileDetailPage } from "@workspace/agent-features/features/affaires-consulaires";
import { ProfileHeroCard } from "@/components/dashboard/profile/profile-hero-card";
import { ProfileConsularCard } from "@/components/dashboard/profile/profile-consular-card";
import { ProfileDocumentsCard } from "@/components/dashboard/profile/profile-documents-card";
import { ProfileRequestsCard } from "@/components/dashboard/profile/profile-requests-card";
import { ProfileChildrenCard } from "@/components/dashboard/profile/profile-children-card";
import { CitizenDossierSections } from "@/components/dashboard/profile/citizen-dossier-sections";
import { ProfileNotesPanel } from "@/components/dashboard/profile/profile-notes-panel";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

export default function Page() {
	return (
		<ProfileDetailPage
			ProfileHeroCard={ProfileHeroCard}
			ProfileConsularCard={ProfileConsularCard}
			ProfileDocumentsCard={ProfileDocumentsCard}
			ProfileRequestsCard={ProfileRequestsCard}
			ProfileChildrenCard={ProfileChildrenCard}
			CitizenDossierSections={CitizenDossierSections}
			ProfileNotesPanel={ProfileNotesPanel}
			DocumentPreviewModal={DocumentPreviewModal}
		/>
	);
}
