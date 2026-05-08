"use client";

import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useOrg } from "../../shell/org-provider";

const SEVERITY_LABELS: Record<string, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Élevé",
	critical: "Critique",
};

const CATEGORY_LABELS: Record<string, string> = {
	observation: "Observation",
	risk: "Risque",
	flag: "Signalement",
	lead: "Piste",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
	family: "Famille",
	business: "Affaires",
	friendship: "Amitié",
	mentor: "Mentor",
	suspect: "Suspect",
	accomplice: "Complice",
	contact: "Contact",
	other: "Autre",
};

const TYPE_LABELS: Record<string, string> = {
	profile: "Citoyen",
	child_profile: "Mineur",
	diplomatic_target: "Contact diplomatique",
	agent: "Agent",
};

interface Props {
	targetType: "profile" | "child_profile" | "diplomatic_target" | "agent";
	targetId: string;
}

export function IntelligenceBriefingButton({ targetType, targetId }: Props) {
	const { activeOrgId } = useOrg();
	const convex = useConvex();
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		if (!activeOrgId) return;
		setLoading(true);
		try {
			const data = await convex.query(api.functions.intelligence.getBriefing, {
				orgId: activeOrgId,
				targetType,
				targetId,
			});

			const targetName = describeTarget(targetType, data.target);
			const md = renderMarkdown({ ...data, targetName });

			const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `briefing-${slugify(targetName)}-${Date.now()}.md`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Briefing téléchargé");
		} catch (_e) {
			toast.error("Impossible de générer le briefing");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleDownload}
			disabled={loading}
		>
			{loading ? (
				<Loader2 className="h-3 w-3 animate-spin mr-1" />
			) : (
				<Download className="h-3 w-3 mr-1" />
			)}
			Briefing
		</Button>
	);
}

function describeTarget(type: string, target: any): string {
	if (!target) return "(cible inconnue)";
	switch (type) {
		case "profile":
			return (
				`${target.identity?.firstName ?? ""} ${target.identity?.lastName ?? ""}`.trim() ||
				"(sans nom)"
			);
		case "child_profile":
			return `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || "(sans nom)";
		case "diplomatic_target":
			return target.name ?? "(sans nom)";
		case "agent":
			return (
				`${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() ||
				target.email ||
				"(agent)"
			);
		default:
			return "(cible)";
	}
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

function renderMarkdown(data: any): string {
	const lines: string[] = [];
	lines.push(`# Briefing Renseignement — ${data.targetName}`);
	lines.push("");
	lines.push(`**Type** : ${TYPE_LABELS[data.targetType] ?? data.targetType}`);
	lines.push(`**Généré le** : ${new Date(data.generatedAt).toLocaleString("fr-FR")}`);
	lines.push("");
	lines.push("> ⚠️ Document confidentiel — usage interne Renseignement uniquement.");
	lines.push("");

	if (data.watchlists?.length) {
		lines.push("## Listes de surveillance");
		lines.push("");
		for (const w of data.watchlists) {
			lines.push(`- ${w.name}${w.theme ? ` (${w.theme})` : ""}`);
		}
		lines.push("");
	}

	lines.push(`## Notes (${data.notes.length})`);
	lines.push("");
	if (!data.notes.length) {
		lines.push("_Aucune note enregistrée._");
		lines.push("");
	} else {
		for (const n of data.notes) {
			const date = new Date(n._creationTime).toLocaleDateString("fr-FR");
			lines.push(
				`### ${CATEGORY_LABELS[n.category] ?? n.category} · ${SEVERITY_LABELS[n.severity] ?? n.severity}`,
			);
			lines.push("");
			lines.push(`*${date} — ${n.authorName}*`);
			if (n.classification) lines.push(`*Classification : ${n.classification}*`);
			if (n.source) lines.push(`*Source : ${n.source}*`);
			if (n.verified) lines.push(`*Vérification : ${n.verified}*`);
			lines.push("");
			lines.push(n.content);
			lines.push("");
		}
	}

	if (data.links?.length) {
		lines.push(`## Réseau de relations (${data.links.length})`);
		lines.push("");
		for (const l of data.links) {
			lines.push(
				`- **${RELATIONSHIP_LABELS[l.relationship] ?? l.relationship}** : ${l.toTargetType}/${l.toTargetId}${l.description ? ` — ${l.description}` : ""}`,
			);
		}
		lines.push("");
	}

	return lines.join("\n");
}
