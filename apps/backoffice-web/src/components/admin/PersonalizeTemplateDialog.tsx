"use client";

/**
 * Dialog « Personnaliser ce modèle » déclenché depuis la vignette d'un
 * modèle global sur l'onglet templates d'une représentation.
 *
 * Propose trois chemins dans l'ordre recommandé :
 *   1. Prévisualiser (lecture seule de l'éditeur global)
 *   2. Personnaliser l'entête / pied — recommandé ; édite l'identité
 *      documentaire de la rep sans cloner le modèle
 *   3. Créer une copie éditable — clone le modèle dans la rep (warning :
 *      rompt le lien de synchronisation avec le modèle source)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowRight,
	Eye,
	Files,
	type LucideIcon,
	PaintRoller,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

export interface PersonalizeTemplateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	templateId: Id<"documentTemplates">;
	templateName: string;
	orgId: Id<"orgs">;
}

export function PersonalizeTemplateDialog({
	open,
	onOpenChange,
	templateId,
	templateName,
	orgId,
}: PersonalizeTemplateDialogProps) {
	const router = useRouter();
	const [cloning, setCloning] = useState(false);

	const { mutateAsync: cloneFromGlobal } = useConvexMutationQuery(
		api.functions.documentTemplates.cloneFromGlobal,
	);

	function handlePreview() {
		onOpenChange(false);
		router.push(`/config/templates/${templateId}?orgPreview=${orgId}`);
	}

	function handleBranding() {
		onOpenChange(false);
		router.push(`/reps/${orgId}/branding`);
	}

	async function handleClone() {
		setCloning(true);
		try {
			const newId = await cloneFromGlobal({
				globalTemplateId: templateId,
				orgId,
			});
			toast.success("Copie éditable créée");
			onOpenChange(false);
			router.push(`/config/templates/${newId}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la copie");
		} finally {
			setCloning(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Personnaliser « {templateName} »</DialogTitle>
					<DialogDescription>
						Adapte ce modèle global aux besoins de cette représentation. Le
						sceau officiel reste identique pour toutes les reps.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 pt-1">
					<OptionButton
						icon={Eye}
						title="Prévisualiser"
						subtitle="Ouvre le modèle dans l'éditeur global en lecture seule."
						onClick={handlePreview}
					/>
					<OptionButton
						icon={PaintRoller}
						title="Personnaliser l'entête et le pied"
						subtitle="Édite l'identité documentaire de la rep (entête, adresse, signataire). Impact immédiat sur les 25 modèles sans duplication."
						recommended
						onClick={handleBranding}
					/>
					<OptionButton
						icon={Files}
						title="Créer une copie éditable"
						subtitle="Clone ce modèle dans la rep. Tu pourras éditer le corps du document, mais tu ne recevras plus les mises à jour du modèle source."
						destructive
						loading={cloning}
						onClick={handleClone}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function OptionButton({
	icon: Icon,
	title,
	subtitle,
	recommended = false,
	destructive = false,
	loading = false,
	onClick,
}: {
	icon: LucideIcon;
	title: string;
	subtitle: string;
	recommended?: boolean;
	destructive?: boolean;
	loading?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className={cn(
				"group flex items-start gap-3 rounded-md border border-border p-3 text-left transition-colors",
				"disabled:cursor-not-allowed disabled:opacity-60",
				recommended && "border-primary/30 bg-primary/5 hover:bg-primary/10",
				destructive &&
					"hover:border-destructive/30 hover:bg-destructive/5",
				!recommended && !destructive && "hover:bg-foreground/5",
			)}
		>
			<Icon
				className={cn(
					"mt-0.5 h-5 w-5 shrink-0",
					recommended ? "text-primary" : "text-muted-foreground",
				)}
			/>
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{title}</span>
					{recommended ? (
						<span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
							Recommandé
						</span>
					) : null}
				</div>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{loading ? "Création en cours…" : subtitle}
				</p>
			</div>
			<ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
		</button>
	);
}
