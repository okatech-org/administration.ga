"use client";

import { useParams } from "next/navigation";
import { CompanyDetailContent } from "@/components/my-space/company-detail";

export default function CompanyDetailPage() {
	const params = useParams();
	const id = params.id as string;
	return <CompanyDetailContent id={id} />;
}
