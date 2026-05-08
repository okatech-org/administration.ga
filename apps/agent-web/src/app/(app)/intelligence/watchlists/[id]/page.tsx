import { IntelligenceWatchlistDetail } from "@workspace/agent-features/features/intelligence";

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <IntelligenceWatchlistDetail watchlistId={id} />;
}
