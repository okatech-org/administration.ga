import { notFound } from "next/navigation";
import { IntelligenceProfileDetail } from "@workspace/agent-features/features/intelligence";

const VALID_TYPES = ["profile", "child_profile", "diplomatic_target", "agent"] as const;
type IntelType = (typeof VALID_TYPES)[number];

function isValidType(value: string): value is IntelType {
	return (VALID_TYPES as readonly string[]).includes(value);
}

export default async function Page({
	params,
}: {
	params: Promise<{ type: string; id: string }>;
}) {
	const { type, id } = await params;
	if (!isValidType(type)) notFound();
	return <IntelligenceProfileDetail targetType={type} targetId={id} />;
}
