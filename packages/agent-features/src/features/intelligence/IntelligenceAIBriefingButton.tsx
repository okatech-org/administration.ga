"use client";

import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useOrg } from "../../shell/org-provider";

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

/**
 * Bouton "Briefing IA" — déclenche l'action Gemini qui génère un
 * markdown structuré et le persiste dans `intelligenceBriefings`.
 * Ouvre la fiche briefing dans un nouvel onglet une fois généré.
 */
export function IntelligenceAIBriefingButton({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();
	const convex = useConvex();
	const [loading, setLoading] = useState(false);

	const handleGenerate = async () => {
		if (!activeOrgId) return;
		setLoading(true);
		try {
			const result = await convex.action(
				api.actions.intelligenceBriefings.generateProfileBriefing,
				{ orgId: activeOrgId, targetType, targetId },
			);
			toast.success("Briefing IA généré", {
				description: "Disponible dans /agence/briefings",
			});
			window.open(`/agence/briefings/${result.briefingId}`, "_blank");
		} catch (e) {
			toast.error("Échec de la génération", {
				description: e instanceof Error ? e.message : undefined,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleGenerate}
			disabled={loading}
		>
			{loading ? (
				<Loader2 className="h-3 w-3 animate-spin mr-1" />
			) : (
				<Sparkles className="h-3 w-3 mr-1" />
			)}
			Briefing IA
		</Button>
	);
}
