import { Phone, Video, Building2, MapPin, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AssistanceContactsWidgetProps {
	mainOrgName?: string;
}

export function AssistanceContactsWidget({
	mainOrgName = "Consulat Général du Gabon en France",
}: AssistanceContactsWidgetProps) {

	// Données statiques de démonstration selon le scénario utilisateur
	const contacts = [
		{
			id: "consulat-fr",
			name: mainOrgName,
			type: "Administration",
			description: "Vos démarches consulaires",
			icon: Building2,
			color: "text-blue-500",
			bg: "bg-blue-500/10",
			badge: "Démarches",
		},
		{
			id: "ambassade-fr",
			name: "Ambassade du Gabon en France",
			type: "Représentation",
			description: "Votre juridiction de résidence",
			icon: Landmark,
			color: "text-indigo-500",
			bg: "bg-indigo-500/10",
			badge: "Résidence",
		},
		{
			id: "ambassade-es",
			name: "Ambassade du Gabon en Espagne",
			type: "Séjour Actuel",
			description: "Assistance lors de votre séjour",
			icon: MapPin,
			color: "text-amber-500",
			bg: "bg-amber-500/10",
			badge: "En Séjour",
		},
	];

	return (
		<div className="bg-card rounded-2xl border border-border flex flex-col shrink-0 overflow-hidden mb-2">
			<div className="flex items-center justify-between p-2.5 border-b border-foreground/5 shrink-0 bg-muted/20">
				<div className="flex items-center gap-2.5">
					<div className="p-1.5 rounded-lg bg-teal-500/10">
						<Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
					</div>
					<span className="text-[13px] font-bold">Assistance & Représentations</span>
				</div>
				<Badge variant="outline" className="text-[10px] bg-background py-0.5 px-2">Contact rapide</Badge>
			</div>
			<div className="p-3">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<TooltipProvider delayDuration={300}>
						{contacts.map((contact) => (
							<div key={contact.id} className="flex flex-col gap-2 p-3 bg-muted/40 rounded-xl border border-muted/50 hover:bg-muted/60 transition-colors group">
								<div className="flex items-start justify-between">
									<div className={`p-1.5 rounded-lg ${contact.bg} shrink-0`}>
										<contact.icon className={`h-4.5 w-4.5 ${contact.color}`} />
									</div>
									<Badge variant="secondary" className="text-[9px] font-semibold h-4.5 px-2 py-0">{contact.badge}</Badge>
								</div>
								
								<div className="flex-1 mt-1.5">
									<h4 className="font-bold text-[12px] leading-tight line-clamp-2">{contact.name}</h4>
									<p className="text-[10px] text-muted-foreground mt-1 font-medium line-clamp-1">{contact.description}</p>
								</div>

								<ContactActionToggle />
							</div>
						))}
					</TooltipProvider>
				</div>
			</div>
		</div>
	);
}

function ContactActionToggle() {
	const [mode, setMode] = useState<"audio" | "video" | null>(null);

	return (
		<div className="relative flex items-center bg-background rounded-lg p-0.5 mt-2 border border-border shadow-sm group-hover:border-teal-500/30 transition-colors">
			{/* Fond coulissant */}
			<div
				className={cn(
					"absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-300 ease-in-out",
					mode === "audio" 
						? "left-0.5 bg-teal-500 shadow-sm" 
						: mode === "video" 
						? "left-[calc(50%+1.5px)] bg-teal-500 shadow-sm" 
						: "bg-transparent"
				)}
			/>
			
			<button
				type="button"
				onClick={() => setMode(mode === "audio" ? null : "audio")}
				className={cn(
					"relative z-10 flex-1 flex justify-center items-center gap-1.5 h-7 text-[10px] font-semibold transition-colors rounded-md",
					mode === "audio" ? "text-white" : "text-muted-foreground hover:text-teal-600 hover:bg-teal-500/5"
				)}
			>
				<Phone className="w-3 h-3" /> Audio
			</button>

			<button
				type="button"
				onClick={() => setMode(mode === "video" ? null : "video")}
				className={cn(
					"relative z-10 flex-1 flex justify-center items-center gap-1.5 h-7 text-[10px] font-semibold transition-colors rounded-md",
					mode === "video" ? "text-white" : "text-muted-foreground hover:text-teal-600 hover:bg-teal-500/5"
				)}
			>
				<Video className="w-3 h-3" /> Vidéo
			</button>
		</div>
	);
}
