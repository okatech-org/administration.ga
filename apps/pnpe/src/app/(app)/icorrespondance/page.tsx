"use client";

import ICorrespondancePage from "@workspace/agent-features/features/icorrespondance";
import { InlineAISuggestion } from "@/components/ai/proactive/InlineAISuggestion";

export default function Page() {
	return <ICorrespondancePage InlineAISuggestion={InlineAISuggestion} />;
}
