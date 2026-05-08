import { IntelligenceMapPage } from "@workspace/agent-features/features/intelligence";
import IntelligenceMapInteractive from "@/components/intelligence/IntelligenceMapInteractive";

export default function Page() {
	const hasToken = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
	return hasToken ? <IntelligenceMapInteractive /> : <IntelligenceMapPage />;
}
