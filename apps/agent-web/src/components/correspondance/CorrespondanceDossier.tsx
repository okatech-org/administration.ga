/**
 * CorrespondanceDossier — Composant visuel "dossier de correspondance"
 *
 * Représente visuellement un dossier (pas un fichier) avec :
 * - Couleur contextuelle (brouillon=jaune, envoyé=gris, reçu=bleu, corbeille=rouge)
 * - Badges : nombre de documents, statut, recipientStatus, priorité
 * - Référence + objet
 */

import { FileText, FolderOpen, Paperclip, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CorrespondanceDossierProps {
	reference: string;
	title: string;
	type: string;
	sender: string;
	recipient: string;
	date: string;
	status: string;
	priority: string;
	documentCount: number;
	isCopy?: boolean;
	recipientStatus?: string;
	onClick?: () => void;
}

// Couleurs par contexte
const CONTEXT_COLORS = {
	draft: {
		folder: "text-amber-400",
		bg: "bg-amber-500/8 hover:bg-amber-500/12 border-amber-500/20",
		badge: "bg-amber-500/15 text-amber-400",
	},
	sent: {
		folder: "text-zinc-400",
		bg: "bg-zinc-500/5 hover:bg-zinc-500/10 border-zinc-500/15 opacity-70",
		badge: "bg-zinc-500/15 text-zinc-400",
	},
	received: {
		folder: "text-blue-400",
		bg: "bg-blue-500/8 hover:bg-blue-500/12 border-blue-500/20",
		badge: "bg-blue-500/15 text-blue-400",
	},
	archived: {
		folder: "text-zinc-500",
		bg: "bg-zinc-500/5 hover:bg-zinc-500/8 border-zinc-500/10 opacity-50",
		badge: "bg-zinc-500/15 text-zinc-500",
	},
} as const;

const RECIPIENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
	en_transit: { label: "En transit", color: "text-zinc-400 bg-zinc-500/15" },
	recu: { label: "Reçu", color: "text-blue-400 bg-blue-500/15" },
	en_attente: { label: "En attente", color: "text-orange-400 bg-orange-500/15" },
	approuve: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15" },
	repondu: { label: "Répondu", color: "text-violet-400 bg-violet-500/15" },
};

const TYPE_LABELS: Record<string, string> = {
	note_verbale: "NV",
	lettre_officielle: "LO",
	circulaire: "CIRC",
	telegramme: "TLG",
	memorandum: "MEM",
	communique: "COM",
};

export function CorrespondanceDossier({
	reference,
	title,
	type,
	sender,
	recipient,
	date,
	status,
	priority,
	documentCount,
	isCopy = false,
	recipientStatus,
	onClick,
}: CorrespondanceDossierProps) {
	const contextKey = isCopy ? "sent" : (status as keyof typeof CONTEXT_COLORS);
	const colors = CONTEXT_COLORS[contextKey] ?? CONTEXT_COLORS.draft;
	const rsCfg = recipientStatus ? RECIPIENT_STATUS_LABELS[recipientStatus] : null;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group w-full text-left rounded-xl border p-3.5 transition-all duration-200 cursor-pointer",
				"hover:shadow-md hover:-translate-y-0.5",
				colors.bg,
			)}
		>
			{/* Header : icône dossier + badges */}
			<div className="flex items-start gap-3">
				{/* Icône dossier */}
				<div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isCopy ? "bg-zinc-500/10" : "bg-current/10")}>
					<FolderOpen className={cn("h-5 w-5", colors.folder)} />
				</div>

				{/* Contenu */}
				<div className="flex-1 min-w-0 space-y-1">
					{/* Référence + type */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{isCopy && (
							<span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/40 px-1 py-0.5 rounded">
								Copie
							</span>
						)}
						<Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-mono">
							{TYPE_LABELS[type] ?? type}
						</Badge>
						<span className="text-[10px] text-muted-foreground/60 font-mono truncate">
							{reference}
						</span>
					</div>

					{/* Titre / objet */}
					<p className="text-sm font-medium leading-snug line-clamp-2">
						{title}
					</p>

					{/* Expéditeur → Destinataire */}
					<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
						<span className="truncate max-w-[120px]">{sender}</span>
						<Send className="h-2.5 w-2.5 shrink-0" />
						<span className="truncate max-w-[120px]">{recipient}</span>
					</div>
				</div>
			</div>

			{/* Footer : badges + date */}
			<div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
				{/* Nombre de documents */}
				<span className="text-[9px] h-4 px-1.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-0.5 font-medium">
					<Paperclip className="h-2.5 w-2.5" />
					{documentCount}
				</span>

				{/* Recipient status (pour les copies envoyées) */}
				{isCopy && rsCfg && (
					<span className={cn("text-[9px] h-4 px-1.5 rounded-full inline-flex items-center gap-0.5 font-semibold", rsCfg.color)}>
						{rsCfg.label}
					</span>
				)}

				{/* Priorité */}
				{priority === "urgent" && (
					<span className="text-[9px] h-4 px-1.5 rounded-full bg-red-500/15 text-red-400 font-medium">
						Urgent
					</span>
				)}
				{priority === "confidentiel" && (
					<span className="text-[9px] h-4 px-1.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
						Confidentiel
					</span>
				)}

				{/* Date */}
				<span className="text-[9px] text-muted-foreground/50 ml-auto">
					{date}
				</span>
			</div>
		</button>
	);
}
