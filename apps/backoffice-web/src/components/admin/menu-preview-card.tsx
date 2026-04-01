/**
 * MenuPreviewCard — Aperçu du menu qu'un utilisateur verra dans agent-web.
 *
 * Affiche chaque module du sidebar avec :
 *   ✅ Visible + niveau d'accès (reader/editor/admin)
 *   ❌ Masqué + raison (module désactivé ou pas de permission)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Check,
	Eye,
	Loader2,
	PenLine,
	ShieldCheck,
	X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

const ACCESS_ICONS: Record<string, { icon: typeof Eye; label: string; color: string }> = {
	reader: { icon: Eye, label: "Lecteur", color: "text-blue-500" },
	editor: { icon: PenLine, label: "Éditeur", color: "text-amber-500" },
	admin: { icon: ShieldCheck, label: "Admin", color: "text-emerald-500" },
};

interface MenuPreviewCardProps {
	userId: Id<"users">;
	orgId: Id<"orgs">;
	userName?: string;
	compact?: boolean;
}

export function MenuPreviewCard({ userId, orgId, userName, compact = false }: MenuPreviewCardProps) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.permissions.getResolvedMenuForUser,
		{ userId, orgId },
	);

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-6">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data) {
		return (
			<p className="text-xs text-muted-foreground text-center py-4">
				Aucune affectation dans cette organisation
			</p>
		);
	}

	const visibleCount = data.modules.filter((m) => m.isVisible).length;
	const totalCount = data.modules.length;

	// Grouper par section
	const sections = new Map<string, typeof data.modules>();
	for (const m of data.modules) {
		const section = m.section;
		if (!sections.has(section)) sections.set(section, []);
		sections.get(section)!.push(m);
	}

	if (compact) {
		return (
			<div className="space-y-1">
				<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
					<Badge variant="secondary" className="text-[10px]">
						{visibleCount}/{totalCount} modules
					</Badge>
					{data.isSuperAdmin && (
						<Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
							SuperAdmin
						</Badge>
					)}
				</div>
				{data.modules.map((m) => (
					<div key={m.code} className={cn(
						"flex items-center gap-2 text-xs py-0.5",
						!m.isVisible && "opacity-40",
					)}>
						{m.isVisible ? (
							<Check className="h-3 w-3 text-emerald-500 shrink-0" />
						) : (
							<X className="h-3 w-3 text-red-400 shrink-0" />
						)}
						<span className="flex-1 truncate">{m.label}</span>
						{m.isVisible && m.accessLevel && ACCESS_ICONS[m.accessLevel] && (
							<span className={cn("text-[9px] font-medium", ACCESS_ICONS[m.accessLevel].color)}>
								{ACCESS_ICONS[m.accessLevel].label}
							</span>
						)}
						{!m.isVisible && m.reason && (
							<span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
								{m.reason}
							</span>
						)}
					</div>
				))}
			</div>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm flex items-center gap-2">
					Menu résultant
					{userName && <span className="text-muted-foreground font-normal">— {userName}</span>}
				</CardTitle>
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-[10px]">
						{visibleCount}/{totalCount} volets visibles
					</Badge>
					{data.isSuperAdmin && (
						<Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
							SuperAdmin — accès total
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{[...sections.entries()].map(([section, modules]) => (
					<div key={section}>
						<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{section}</p>
						<div className="space-y-1">
							{modules.map((m) => {
								const accessInfo = m.accessLevel ? ACCESS_ICONS[m.accessLevel] : null;
								const AccessIcon = accessInfo?.icon;
								return (
									<div key={m.code} className={cn(
										"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
										m.isVisible ? "bg-emerald-500/5" : "bg-muted/30 opacity-50",
									)}>
										{m.isVisible ? (
											<Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
										) : (
											<X className="h-3.5 w-3.5 text-red-400 shrink-0" />
										)}
										<span className="flex-1 font-medium">{m.label}</span>
										{m.isVisible && accessInfo && AccessIcon && (
											<Badge variant="outline" className={cn("text-[9px] h-4 px-1 gap-0.5", accessInfo.color)}>
												<AccessIcon className="h-2.5 w-2.5" />
												{accessInfo.label}
											</Badge>
										)}
										{!m.isVisible && m.reason && (
											<span className="text-[9px] text-muted-foreground italic">
												{m.reason}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
