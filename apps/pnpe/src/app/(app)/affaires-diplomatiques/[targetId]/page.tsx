"use client";

import { TargetDetailPage } from "@workspace/agent-features/features/affaires-diplomatiques";
import { InlineAISuggestion } from "@/components/ai/proactive/InlineAISuggestion";

export default function Page() {
	return <TargetDetailPage InlineAISuggestion={InlineAISuggestion} />;
}
