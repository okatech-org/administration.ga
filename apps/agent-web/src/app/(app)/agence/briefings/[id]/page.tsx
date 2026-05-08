import { IntelligenceBriefingDetail } from "@workspace/agent-features/features/intelligence";
import type { Id } from "@convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<IntelligenceBriefingDetail briefingId={id as Id<"intelligenceBriefings">} />
	);
}
