"use client";

import { useParams } from "next/navigation";
import { AssociationDetailContent } from "@/components/my-space/association-detail";

export default function AssociationDetailPage() {
	const params = useParams();
	const slug = params.slug as string;
	return <AssociationDetailContent slug={slug} />;
}
