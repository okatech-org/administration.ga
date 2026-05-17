"use client";

/**
 * citizen-sections — Sections métier propres aux comptes ressortissants.
 *
 * Quatre cartes affichées dans `/users/[userId]` quand le user est citoyen :
 *   1. Inscription consulaire (statut + NIP + représentation)
 *   2. Demandes consulaires (workflow par statut)
 *   3. Documents personnels (vault)
 *   4. Carte consulaire (numéro + impression)
 *
 * Les actions d'édition pointent vers les modules dédiés du back-office plutôt
 * que de dupliquer leur logique métier ici.
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import {
	AlertTriangle,
	BadgeCheck,
	Clock,
	ClipboardList,
	CreditCard,
	ExternalLink,
	FileText,
	IdCard,
	Loader2,
	Printer,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────
const formatDate = (timestamp?: number) =>
	timestamp ? new Date(timestamp).toLocaleDateString("fr-FR") : "—";

const REG_STATUS_LABEL: Record<string, { label: string; classes: string }> = {
	active: { label: "Active", classes: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
	pending: { label: "En attente", classes: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
	validated: { label: "Validée", classes: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
	expired: { label: "Expirée", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
	rejected: { label: "Rejetée", classes: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400" },
};

const REQUEST_STATUS_LABEL: Record<string, { label: string; classes: string }> = {
	draft: { label: "Brouillon", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
	submitted: { label: "Soumise", classes: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
	in_review: { label: "En instruction", classes: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
	awaiting_user: { label: "Action requise", classes: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400" },
	approved: { label: "Approuvée", classes: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
	rejected: { label: "Rejetée", classes: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400" },
	completed: { label: "Clôturée", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
	cancelled: { label: "Annulée", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
};

const DOC_STATUS_LABEL: Record<string, { label: string; classes: string }> = {
	pending: { label: "En attente", classes: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
	validated: { label: "Validé", classes: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
	rejected: { label: "Rejeté", classes: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400" },
	archived: { label: "Archivé", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
};

const PRINT_STATUS_LABEL: Record<string, { label: string; classes: string }> = {
	queued: { label: "En file", classes: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400" },
	printing: { label: "Impression", classes: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400" },
	completed: { label: "Imprimée", classes: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400" },
	failed: { label: "Échec", classes: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400" },
	cancelled: { label: "Annulée", classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:text-zinc-400" },
};

// ════════════════════════════════════════════════════════════
// 1. Inscription consulaire
// ════════════════════════════════════════════════════════════
export function CitizenConsularRegistrationSection({ userId }: { userId: Id<"users"> }) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getCitizenConsularRegistration,
		{ userId },
	);

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<BadgeCheck className="h-4 w-4" />}
					title="Inscription consulaire"
					actions={
						<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
							<Link href="/affaires-consulaires">
								<ExternalLink className="h-3 w-3 mr-1" />
								Module
							</Link>
						</Button>
					}
				/>
				<p className="text-xs text-muted-foreground mb-3">
					Statut d'inscription au registre consulaire
				</p>

				{isPending ? (
					<Skeleton className="h-20 w-full rounded-md" />
				) : !data ? (
					<p className="text-sm text-muted-foreground text-center py-6">
						Aucune inscription consulaire enregistrée
					</p>
				) : (
					<div className="space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Statut</span>
							<Badge
								variant="outline"
								className={cn(
									"text-xs",
									REG_STATUS_LABEL[data.status]?.classes ?? "",
								)}
							>
								{REG_STATUS_LABEL[data.status]?.label ?? data.status}
							</Badge>
						</div>
						{data.org && (
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm text-muted-foreground shrink-0">Représentation</span>
								<span className="text-sm font-medium truncate text-right">
									{data.org.name}
								</span>
							</div>
						)}
						{data.nip && (
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">NIP</span>
								<code className="text-sm font-mono">{data.nip}</code>
							</div>
						)}
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Inscrit le</span>
							<span className="text-sm">{formatDate(data.registeredAt)}</span>
						</div>
						{data.activatedAt && (
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Activée le</span>
								<span className="text-sm">{formatDate(data.activatedAt)}</span>
							</div>
						)}
						{data.expiresAt && (
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Expire le</span>
								<span className="text-sm">{formatDate(data.expiresAt)}</span>
							</div>
						)}
						{data.totalCount > 1 && (
							<p className="text-[11px] text-muted-foreground pt-1">
								+ {data.totalCount - 1} autre{data.totalCount > 2 ? "s" : ""}{" "}
								inscription{data.totalCount > 2 ? "s" : ""} historique
								{data.totalCount > 2 ? "s" : ""}
							</p>
						)}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

// ════════════════════════════════════════════════════════════
// 2. Demandes consulaires
// ════════════════════════════════════════════════════════════
export function CitizenRequestsSection({ userId }: { userId: Id<"users"> }) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.listCitizenRequests,
		{ userId, limit: 10 },
	);

	const requests = data ?? [];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<ClipboardList className="h-4 w-4" />}
					title="Demandes consulaires"
					actions={
						<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
							<Link href="/requests">
								<ExternalLink className="h-3 w-3 mr-1" />
								Module
							</Link>
						</Button>
					}
				/>
				<p className="text-xs text-muted-foreground mb-3">
					{requests.length === 0
						? "Aucune demande déposée"
						: `${requests.length} dernière${requests.length > 1 ? "s" : ""} demande${requests.length > 1 ? "s" : ""}`}
				</p>

				{isPending ? (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-10 w-full rounded-md" />
						))}
					</div>
				) : requests.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-6">
						Cet utilisateur n'a déposé aucune demande consulaire.
					</p>
				) : (
					<div className="space-y-1.5">
						{requests.map((r: any) => {
							const statusMeta = REQUEST_STATUS_LABEL[r.status] ?? {
								label: r.status,
								classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300",
							};
							return (
								<Link
									key={r._id}
									href={`/requests/${r._id}`}
									className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-muted/30 transition-colors group"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<code className="text-xs font-medium truncate">{r.reference}</code>
											<Badge
												variant="outline"
												className={cn("text-[10px] h-4 px-1.5", statusMeta.classes)}
											>
												{statusMeta.label}
											</Badge>
											{r.actionsRequiredCount > 0 && (
												<Badge variant="destructive" className="text-[10px] h-4 px-1.5">
													<AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
													{r.actionsRequiredCount}
												</Badge>
											)}
										</div>
										<p className="text-[11px] text-muted-foreground truncate mt-0.5">
											{r.org?.name ?? "—"}
											{r.service?.code && <span className="mx-1.5">·</span>}
											{r.service?.code}
											<span className="mx-1.5">·</span>
											MAJ {formatDate(r.updatedAt)}
										</p>
									</div>
									<ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

// ════════════════════════════════════════════════════════════
// 3. Documents personnels
// ════════════════════════════════════════════════════════════
export function CitizenDocumentsSection({ userId }: { userId: Id<"users"> }) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.listCitizenDocuments,
		{ userId, limit: 15 },
	);

	const docs = data ?? [];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<FileText className="h-4 w-4" />}
					title="Documents personnels"
					actions={
						<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
							<Link href="/idocument">
								<ExternalLink className="h-3 w-3 mr-1" />
								iDocument
							</Link>
						</Button>
					}
				/>
				<p className="text-xs text-muted-foreground mb-3">
					{docs.length === 0
						? "Coffre vide"
						: `${docs.length} document${docs.length > 1 ? "s" : ""} dans le coffre`}
				</p>

				{isPending ? (
					<div className="space-y-2">
						{[1, 2].map((i) => (
							<Skeleton key={i} className="h-10 w-full rounded-md" />
						))}
					</div>
				) : docs.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-6">
						Aucun document personnel n'a été téléversé.
					</p>
				) : (
					<div className="space-y-1.5">
						{docs.map((d: any) => {
							const statusMeta = DOC_STATUS_LABEL[d.status] ?? {
								label: d.status,
								classes: "bg-zinc-500/10 text-zinc-700 border-zinc-300",
							};
							const isExpired = d.expiresAt && d.expiresAt < Date.now();
							return (
								<div
									key={d._id}
									className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card"
								>
									<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-medium truncate">
												{d.label || d.documentType || "Document sans titre"}
											</span>
											<Badge
												variant="outline"
												className={cn("text-[10px] h-4 px-1.5", statusMeta.classes)}
											>
												{statusMeta.label}
											</Badge>
											{isExpired && (
												<Badge variant="destructive" className="text-[10px] h-4 px-1.5">
													Expiré
												</Badge>
											)}
											{d.archivedAt && (
												<Badge variant="outline" className="text-[10px] h-4 px-1.5">
													Archivé
												</Badge>
											)}
										</div>
										<p className="text-[11px] text-muted-foreground truncate mt-0.5">
											{d.category && <span>{d.category}</span>}
											{d.fileCount > 0 && (
												<>
													<span className="mx-1.5">·</span>
													{d.fileCount} fichier{d.fileCount > 1 ? "s" : ""}
												</>
											)}
											{d.expiresAt && (
												<>
													<span className="mx-1.5">·</span>
													Expire {formatDate(d.expiresAt)}
												</>
											)}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</FlatCard>
	);
}

// ════════════════════════════════════════════════════════════
// 4. Carte consulaire
// ════════════════════════════════════════════════════════════
export function CitizenConsularCardSection({ userId }: { userId: Id<"users"> }) {
	const { data, isPending } = useAuthenticatedConvexQuery(
		api.functions.admin.getCitizenConsularCard,
		{ userId },
	);

	const cardExpired = data?.cardExpiresAt && data.cardExpiresAt < Date.now();

	return (
		<FlatCard>
			<div className="p-3 lg:p-4">
				<SectionHeader
					icon={<IdCard className="h-4 w-4" />}
					title="Carte consulaire"
					actions={
						<Button asChild variant="ghost" size="sm" className="h-7 text-xs">
							<Link href="/affaires-consulaires">
								<ExternalLink className="h-3 w-3 mr-1" />
								Gérer
							</Link>
						</Button>
					}
				/>
				<p className="text-xs text-muted-foreground mb-3">
					Carte consulaire active et statut d'impression
				</p>

				{isPending ? (
					<Skeleton className="h-24 w-full rounded-md" />
				) : !data ? (
					<div className="text-sm text-muted-foreground text-center py-6 space-y-1">
						<CreditCard className="h-6 w-6 mx-auto opacity-40" />
						<p>Aucune carte consulaire émise</p>
					</div>
				) : (
					<div className="space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Numéro de carte</span>
							<code className="text-sm font-mono font-medium">
								{data.cardNumber}
							</code>
						</div>
						{data.org && (
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm text-muted-foreground shrink-0">Émise par</span>
								<span className="text-sm truncate text-right">{data.org.name}</span>
							</div>
						)}
						{data.cardIssuedAt && (
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Émise le</span>
								<span className="text-sm">{formatDate(data.cardIssuedAt)}</span>
							</div>
						)}
						{data.cardExpiresAt && (
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Expire le</span>
								<div className="flex items-center gap-1.5">
									<span className="text-sm">{formatDate(data.cardExpiresAt)}</span>
									{cardExpired && (
										<Badge variant="destructive" className="text-[10px] h-4 px-1.5">
											<XCircle className="h-2.5 w-2.5 mr-0.5" />
											Expirée
										</Badge>
									)}
								</div>
							</div>
						)}

						<div className="border-t pt-2.5 mt-2">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground flex items-center gap-1.5">
									<Printer className="h-3.5 w-3.5" />
									Impression
								</span>
								<div className="flex items-center gap-1.5">
									{data.printedAt ? (
										<>
											<Badge
												variant="outline"
												className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400"
											>
												Imprimée
											</Badge>
											<span className="text-[11px] text-muted-foreground">
												{formatDate(data.printedAt)}
											</span>
										</>
									) : data.lastPrintJob ? (
										<Badge
											variant="outline"
											className={cn(
												"text-[10px] h-4 px-1.5",
												PRINT_STATUS_LABEL[data.lastPrintJob.status]?.classes ?? "",
											)}
										>
											{data.lastPrintJob.status === "printing" && (
												<Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
											)}
											{data.lastPrintJob.status === "queued" && (
												<Clock className="h-2.5 w-2.5 mr-0.5" />
											)}
											{PRINT_STATUS_LABEL[data.lastPrintJob.status]?.label ??
												data.lastPrintJob.status}
										</Badge>
									) : (
										<Badge variant="outline" className="text-[10px] h-4 px-1.5">
											Non imprimée
										</Badge>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</FlatCard>
	);
}
