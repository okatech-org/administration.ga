"use client";

/**
 * Sélecteur de représentation pour l'aperçu WYSIWYG du template global.
 *
 * Dans l'éditeur super-admin, l'entête / pied ne sont pas saisis à la main :
 * ils reflètent le **branding** de la représentation choisie ici. Le super-
 * admin peut ainsi basculer entre "Ambassade Madrid", "Consulat Paris",
 * "Mission permanente ONU"... et voir immédiatement à quoi ressemblera le
 * document rendu pour chacune.
 *
 * Pour modifier réellement l'entête / pied d'une rep, on redirige vers
 * `/reps/[orgId]/branding` via le bouton "Modifier cette rep".
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { HEADING_FONTS } from "@workspace/document-editor";
import { ExternalLink, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConvexQuery } from "@/integrations/convex/hooks";

export interface RepresentationHeaderPreviewProps {
	previewOrgId: Id<"orgs"> | null;
	onPreviewOrgIdChange: (id: Id<"orgs"> | null) => void;
	/** Police du nom de la représentation en entête. Défaut : "Optima". */
	headerFontFamily: string;
	onHeaderFontFamilyChange: (value: string) => void;
	/** Hauteur du sceau en px (affichage preview). Défaut : 80. */
	logoHeightPx: number;
	onLogoHeightPxChange: (value: number) => void;
	/**
	 * Lignes d'entête du template (modifiables quand l'aperçu est générique).
	 * Une ligne par saut de ligne. Ignoré quand une rep est sélectionnée
	 * (la rep fournit ses propres lignes via son branding).
	 */
	templateHeaderText: string;
	onTemplateHeaderTextChange: (text: string) => void;
}

export function RepresentationHeaderPreview({
	previewOrgId,
	onPreviewOrgIdChange,
	headerFontFamily,
	onHeaderFontFamilyChange,
	logoHeightPx,
	onLogoHeightPxChange,
	templateHeaderText,
	onTemplateHeaderTextChange,
}: RepresentationHeaderPreviewProps) {
	const router = useRouter();
	const { data: orgs, isLoading } = useConvexQuery(
		api.functions.admin.listOrgs,
		{},
	);

	const sortedOrgs = useMemo(() => {
		const list = (orgs ?? []) as Array<Doc<"orgs">>;
		return [...list]
			.filter((o) => !o.deletedAt)
			.sort((a, b) =>
				(a.name ?? "").localeCompare(b.name ?? "", "fr", {
					sensitivity: "base",
				}),
			);
	}, [orgs]);

	const selected = sortedOrgs.find((o) => o._id === previewOrgId) ?? null;
	const effectiveLines = deriveHeaderLines(selected);
	const effectiveFooter = deriveFooterLines(selected);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs text-muted-foreground">
				<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
				<p>
					Choisis une représentation pour prévisualiser son entête et son pied
					sur le document. Les modifications se font directement dans la page
					de branding de la rep.
				</p>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="preview-org" className="text-xs font-medium">
					Représentation
				</Label>
				<Select
					value={previewOrgId ?? "_none"}
					onValueChange={(v) =>
						onPreviewOrgIdChange(v === "_none" ? null : (v as Id<"orgs">))
					}
					disabled={isLoading}
				>
					<SelectTrigger id="preview-org" size="sm">
						<SelectValue
							placeholder={
								isLoading ? "Chargement…" : "Aperçu générique (aucune rep)"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_none">Aperçu générique</SelectItem>
						{sortedOrgs.map((org) => (
							<SelectItem key={org._id} value={org._id as unknown as string}>
								{org.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Police du nom de la représentation (entête) */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="header-font" className="text-xs font-medium">
					Police du nom de la représentation
				</Label>
				<Select
					value={headerFontFamily || "Optima"}
					onValueChange={(v) => onHeaderFontFamilyChange(v)}
				>
					<SelectTrigger id="header-font" size="sm">
						<SelectValue placeholder="Optima" />
					</SelectTrigger>
					<SelectContent>
						{HEADING_FONTS.map((f) => (
							<SelectItem
								key={f.value}
								value={f.value}
								style={{ fontFamily: f.value }}
							>
								{f.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Hauteur du sceau */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<Label htmlFor="logo-height" className="text-xs font-medium">
						Hauteur du sceau
					</Label>
					<span className="text-xs tabular-nums text-muted-foreground">
						{logoHeightPx} px
					</span>
				</div>
				<Input
					id="logo-height"
					type="range"
					min={40}
					max={200}
					step={4}
					value={logoHeightPx}
					onChange={(e) => onLogoHeightPxChange(Number(e.target.value))}
					className="h-7 cursor-pointer p-0"
				/>
			</div>

			{selected ? (
				<>
					<div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/10 p-3">
						<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Entête de la rep
						</div>
						{effectiveLines.length > 0 ? (
							<div className="flex flex-col gap-0.5 text-xs font-medium text-foreground">
								{effectiveLines.map((line, idx) => (
									<div key={idx}>{line}</div>
								))}
							</div>
						) : (
							<div className="text-xs italic text-muted-foreground">
								Aucune ligne définie — le nom de la rep sera utilisé.
							</div>
						)}
					</div>

					<div className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/10 p-3">
						<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Pied de page
						</div>
						{effectiveFooter.length > 0 ? (
							<div className="flex flex-col gap-0.5 text-xs italic text-foreground">
								{effectiveFooter.map((line, idx) => (
									<div key={idx}>{line}</div>
								))}
							</div>
						) : (
							<div className="text-xs italic text-muted-foreground">
								Aucune adresse / contact — pied vide au rendu.
							</div>
						)}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							router.push(`/reps/${selected._id}/branding`)
						}
						className="w-full justify-between"
					>
						Modifier l'identité de cette rep
						<ExternalLink className="ml-2 h-3.5 w-3.5" />
					</Button>
				</>
			) : (
				// Mode aperçu générique : éditer directement les lignes du template.
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="tpl-header-lines" className="text-xs font-medium">
						Lignes d'entête du modèle
					</Label>
					<Textarea
						id="tpl-header-lines"
						value={templateHeaderText}
						onChange={(e) => onTemplateHeaderTextChange(e.target.value)}
						rows={6}
						placeholder={"AMBASSADE DU GABON\nPRÈS LE ROYAUME D'ESPAGNE\n..."}
						className="font-mono text-xs"
					/>
					<p className="text-xs text-muted-foreground">
						Une ligne par saut de ligne. Les sauts que tu supprimes
						concatènent les lignes sur le document.
					</p>
				</div>
			)}
		</div>
	);
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Dérive les lignes d'entête qui seront rendues pour une rep donnée :
 *   - `branding.headerLines` si défini
 *   - sinon `[org.name.toUpperCase()]` comme fallback automatique
 */
export function deriveHeaderLines(
	org: Doc<"orgs"> | null | undefined,
): string[] {
	if (!org) return [];
	const branding = org.branding as { headerLines?: string[] } | undefined;
	const explicit = (branding?.headerLines ?? [])
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	if (explicit.length > 0) return explicit;
	const name = (org.name ?? "").trim();
	return name ? [name.toUpperCase()] : [];
}

/**
 * Dérive les lignes du pied de page d'une rep : adresse en 1ère ligne, puis
 * TEL | Email sur la 2ème. Chaque segment manquant est omis.
 */
export function deriveFooterLines(
	org: Doc<"orgs"> | null | undefined,
): string[] {
	if (!org) return [];
	const branding = org.branding as
		| {
				footerAddress?: string;
				footerPhone?: string;
				footerEmail?: string;
		  }
		| undefined;
	const lines: string[] = [];
	if (branding?.footerAddress?.trim()) lines.push(branding.footerAddress.trim());
	const contactParts: string[] = [];
	if (branding?.footerPhone?.trim())
		contactParts.push(`TEL : ${branding.footerPhone.trim()}`);
	if (branding?.footerEmail?.trim())
		contactParts.push(`Email : ${branding.footerEmail.trim()}`);
	if (contactParts.length > 0) lines.push(contactParts.join(" | "));
	return lines;
}
