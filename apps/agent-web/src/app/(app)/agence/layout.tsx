import type { ReactNode } from "react"
import { IntelligenceAgencyGate } from "@workspace/agent-features/components/shared"

export const dynamic = "force-dynamic"

export default function AgenceLayout({ children }: { children: ReactNode }) {
	return <IntelligenceAgencyGate>{children}</IntelligenceAgencyGate>
}
