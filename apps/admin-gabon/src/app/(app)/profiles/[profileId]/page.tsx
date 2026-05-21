"use client"

import { ProfileDetailPage } from "@workspace/agent-features/features/profiles"
import { ProfileDetailView } from "@/components/dashboard/ProfileDetailView"

export default function AdminProfileDetailPage() {
	return <ProfileDetailPage ProfileDetailView={ProfileDetailView} />
}
