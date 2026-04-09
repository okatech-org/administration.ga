"use client"

import { api } from "@convex/_generated/api";
import { useConvexQuery } from "@/integrations/convex/hooks";
import { AboutSection } from "@/components/blocks/about-section";

export function WhySection() {
	const { data: orgs } = useConvexQuery(api.functions.orgs.list, {});
	const { data: services } = useConvexQuery(
		api.functions.services.listCatalog,
		{},
	);

	return (
		<AboutSection
			title="Pourquoi Consulat.ga ?"
			description="Une plateforme moderne, securisee et accessible pour simplifier vos demarches consulaires, ou que vous soyez dans le monde."
			achievements={[
				{ label: "Citoyens accompagnes", value: "15K+" },
				{
					label: "Representations mondiales",
					value: `${orgs?.length ?? 50}+`,
				},
				{
					label: "Services disponibles",
					value: `${services?.length ?? 39}`,
				},
				{ label: "Assistance permanente", value: "24/7" },
			]}
		/>
	);
}
