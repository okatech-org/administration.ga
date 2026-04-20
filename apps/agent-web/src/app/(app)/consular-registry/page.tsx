"use client"

import ConsularRegistryPage from "@workspace/agent-features/features/consular-registry"
import { ProfileViewSheet } from "@/components/dashboard/ProfileViewSheet"

export default function Page() {
	return <ConsularRegistryPage ProfileViewSheet={ProfileViewSheet} />
}
