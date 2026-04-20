"use client"

import { RequestDetailPage } from "@workspace/agent-features/features/requests"
import { InlineAISuggestion } from "@/components/ai/proactive/InlineAISuggestion"
import { RequestActionModal } from "@/components/admin/RequestActionModal"
import { OfficialDocumentsSection } from "@/components/requests/OfficialDocumentsSection"
import { UserProfilePreviewCard } from "@/components/dashboard/UserProfilePreviewCard"

export default function AdminRequestDetailPage() {
	return (
		<RequestDetailPage
			InlineAISuggestion={InlineAISuggestion}
			RequestActionModal={RequestActionModal}
			OfficialDocumentsSection={OfficialDocumentsSection}
			UserProfilePreviewCard={UserProfilePreviewCard}
		/>
	)
}
