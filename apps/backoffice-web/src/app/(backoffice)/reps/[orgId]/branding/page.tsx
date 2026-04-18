"use client";

/**
 * Personnalisation documentaire d'une représentation.
 *
 * Surcharge l'entête / le pied de page / le signataire / la ville utilisés
 * lors du rendu des 25 modèles diplomatiques globaux, sans cloner les
 * modèles sources. Le sceau, lui, reste identique pour toutes les reps.
 *
 * Sauvegarde via `api.functions.orgs.updateBranding` — la mutation
 * persiste l'objet `branding` complet, on merge donc avec les autres
 * facettes de branding (couleurs, description publique, réseaux sociaux)
 * déjà présentes sur l'org pour ne rien écraser.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	Building2,
	FileSignature,
	Plus,
	Save,
	Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
import { SectionHeader } from "@/components/design-system/section-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

const MAX_HEADER_LINES = 6;

export default function OrgBrandingPage() {
	const params = useParams<{ orgId: string }>();
	const orgId = params.orgId as Id<"orgs">;
	const router = useRouter();

	const { data: org, isPending } = useAuthenticatedConvexQuery(
		api.functions.orgs.getById,
		{ orgId },
	);

	const { mutateAsync: updateBranding, isPending: isSaving } =
		useConvexMutationQuery(api.functions.orgs.updateBranding);

	// Local state des 7 champs document-centric
	const [headerLines, setHeaderLines] = useState<string[]>([""]);
	const [footerAddress, setFooterAddress] = useState("");
	const [footerPhone, setFooterPhone] = useState("");
	const [footerEmail, setFooterEmail] = useState("");
	const [signerName, setSignerName] = useState("");
	const [signerTitle, setSignerTitle] = useState("");
	const [cityName, setCityName] = useState("");
	const [initialized, setInitialized] = useState(false);

	// Synchro serveur unique — au premier load. L'utilisateur peut ensuite
	// édition locale sans que le useEffect ne clobbérise ses changements.
	useEffect(() => {
		if (!org || initialized) return;
		const b = org.branding ?? {};
		setHeaderLines(
			(b.headerLines && b.headerLines.length > 0 ? b.headerLines : [""]).slice(
				0,
				MAX_HEADER_LINES,
			),
		);
		setFooterAddress(b.footerAddress ?? "");
		setFooterPhone(b.footerPhone ?? "");
		setFooterEmail(b.footerEmail ?? "");
		setSignerName(b.signerName ?? "");
		setSignerTitle(b.signerTitle ?? "");
		setCityName(b.cityName ?? "");
		setInitialized(true);
	}, [org, initialized]);

	const cleanedLines = useMemo(
		() => headerLines.map((l) => l.trim()).filter((l) => l.length > 0),
		[headerLines],
	);

	async function handleSave() {
		if (!org) return;
		const existing = (org.branding ?? {}) as NonNullable<
			Doc<"orgs">["branding"]
		>;
		try {
			await updateBranding({
				orgId,
				branding: {
					...existing,
					headerLines: cleanedLines.length > 0 ? cleanedLines : undefined,
					footerAddress: footerAddress.trim() || undefined,
					footerPhone: footerPhone.trim() || undefined,
					footerEmail: footerEmail.trim() || undefined,
					signerName: signerName.trim() || undefined,
					signerTitle: signerTitle.trim() || undefined,
					cityName: cityName.trim() || undefined,
				},
			});
			toast.success("Identité documentaire enregistrée");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la sauvegarde");
		}
	}

	function addHeaderLine() {
		if (headerLines.length >= MAX_HEADER_LINES) return;
		setHeaderLines([...headerLines, ""]);
	}

	function updateHeaderLine(index: number, value: string) {
		setHeaderLines(headerLines.map((l, i) => (i === index ? value : l)));
	}

	function removeHeaderLine(index: number) {
		const next = headerLines.filter((_, i) => i !== index);
		setHeaderLines(next.length > 0 ? next : [""]);
	}

	if (isPending) return <PageSkeleton />;
	if (!org) return null;

	const orgDisplayName =
		typeof org.name === "string" ? org.name : String(org.name ?? "");

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Identité documentaire"
				subtitle={`Personnalisation des 25 modèles pour ${orgDisplayName}`}
				icon={<FileSignature />}
				showBackButton
				onBack={() => router.push(`/reps/${orgId}`)}
				actions={
					<Button onClick={handleSave} disabled={isSaving}>
						<Save className="mr-2 h-4 w-4" />
						{isSaving ? "Enregistrement…" : "Enregistrer"}
					</Button>
				}
			/>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
				{/* ─── Formulaire ──────────────────────────────────── */}
				<div className="flex flex-col gap-4">
					{/* Entête */}
					<FlatCard>
						<div className="p-4">
							<SectionHeader
								icon={<Building2 className="h-4 w-4" />}
								title="Entête du document"
							/>
							<p className="mb-4 text-xs text-muted-foreground">
								Lignes centrées affichées en haut de chaque modèle généré,
								au-dessus du sceau. Laisser vide pour conserver l'entête
								par défaut (« AMBASSADE DU GABON PRÈS LE ROYAUME D'ESPAGNE »).
							</p>
							<div className="flex flex-col gap-2">
								{headerLines.map((line, idx) => (
									<div
										key={`hdr-${idx}`}
										className="flex items-center gap-2"
									>
										<Input
											value={line}
											onChange={(e) => updateHeaderLine(idx, e.target.value)}
											placeholder={
												idx === 0
													? "AMBASSADE DU GABON"
													: "Ligne supplémentaire…"
											}
											className="flex-1"
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => removeHeaderLine(idx)}
											aria-label={`Supprimer la ligne ${idx + 1}`}
											disabled={headerLines.length === 1 && line === ""}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								))}
								{headerLines.length < MAX_HEADER_LINES ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={addHeaderLine}
										className="self-start"
									>
										<Plus className="mr-1.5 h-3.5 w-3.5" />
										Ajouter une ligne
									</Button>
								) : null}
							</div>
						</div>
					</FlatCard>

					{/* Pied de page */}
					<FlatCard>
						<div className="p-4">
							<SectionHeader
								icon={<Building2 className="h-4 w-4" />}
								title="Pied de page"
							/>
							<p className="mb-4 text-xs text-muted-foreground">
								Adresse postale, téléphone et email affichés en bas de chaque
								document généré.
							</p>
							<div className="flex flex-col gap-3">
								<Field>
									<FieldLabel>Adresse complète</FieldLabel>
									<Input
										value={footerAddress}
										onChange={(e) => setFooterAddress(e.target.value)}
										placeholder="CALLE ORENSE - 68 - 2° IZQ. - 28020 - MADRID – ESPAÑA"
									/>
								</Field>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<Field>
										<FieldLabel>Téléphone</FieldLabel>
										<Input
											value={footerPhone}
											onChange={(e) => setFooterPhone(e.target.value)}
											placeholder="(+34) 914 138 211"
										/>
									</Field>
									<Field>
										<FieldLabel>Email</FieldLabel>
										<Input
											type="email"
											value={footerEmail}
											onChange={(e) => setFooterEmail(e.target.value)}
											placeholder="secretariagabon@gmail.com"
										/>
									</Field>
								</div>
							</div>
						</div>
					</FlatCard>

					{/* Signataire & ville */}
					<FlatCard>
						<div className="p-4">
							<SectionHeader
								icon={<FileSignature className="h-4 w-4" />}
								title="Signataire & ville"
							/>
							<p className="mb-4 text-xs text-muted-foreground">
								Injectés dans les placeholders{" "}
								<code className="rounded bg-foreground/5 px-1 py-0.5 text-[10px]">
									{"{{system.signerName}}"}
								</code>
								,{" "}
								<code className="rounded bg-foreground/5 px-1 py-0.5 text-[10px]">
									{"{{system.signerTitle}}"}
								</code>
								,{" "}
								<code className="rounded bg-foreground/5 px-1 py-0.5 text-[10px]">
									{"{{system.city}}"}
								</code>{" "}
								lorsqu'ils sont présents dans le modèle.
							</p>
							<div className="flex flex-col gap-3">
								<Field>
									<FieldLabel>Nom du signataire</FieldLabel>
									<Input
										value={signerName}
										onChange={(e) => setSignerName(e.target.value)}
										placeholder="Jean-Pierre NZOGHE-NGUEMA"
									/>
								</Field>
								<Field>
									<FieldLabel>Titre / Fonction</FieldLabel>
									<Input
										value={signerTitle}
										onChange={(e) => setSignerTitle(e.target.value)}
										placeholder="Conseiller chargé des Affaires Consulaires"
									/>
								</Field>
								<Field>
									<FieldLabel>Ville de la représentation</FieldLabel>
									<Input
										value={cityName}
										onChange={(e) => setCityName(e.target.value)}
										placeholder="Madrid"
									/>
								</Field>
							</div>
						</div>
					</FlatCard>
				</div>

				{/* ─── Preview live ─────────────────────────────────── */}
				<BrandingPreview
					headerLines={cleanedLines}
					footerAddress={footerAddress}
					footerPhone={footerPhone}
					footerEmail={footerEmail}
					signerName={signerName}
					signerTitle={signerTitle}
					cityName={cityName}
				/>
			</div>
		</div>
	);
}

// ─── Preview ─────────────────────────────────────────────────────────

interface BrandingPreviewProps {
	headerLines: string[];
	footerAddress: string;
	footerPhone: string;
	footerEmail: string;
	signerName: string;
	signerTitle: string;
	cityName: string;
}

/**
 * Aperçu statique d'un modèle type (« Certificat de Célibat ») avec les
 * overrides appliqués. Ne reproduit pas fidèlement le rendu PDF final —
 * c'est un aperçu visuel rapide pour valider les saisies.
 */
function BrandingPreview(props: BrandingPreviewProps) {
	const city = props.cityName.trim() || "Madrid";
	const signer = props.signerName.trim() || "[Nom du Conseiller]";
	const title =
		props.signerTitle.trim() || "Le Conseiller chargé des Affaires Consulaires";
	const lines =
		props.headerLines.length > 0
			? props.headerLines
			: [
					"AMBASSADE DU GABON",
					"PRÈS LE ROYAUME D'ESPAGNE ET",
					"REPRÉSENTATION PERMANENTE DU GABON",
					"AUPRÈS DE L'ORGANISATION",
					"DES NATIONS UNIES POUR LE TOURISME",
				];
	const contactLine = [
		props.footerPhone.trim() ? `TEL : ${props.footerPhone.trim()}` : "",
		props.footerEmail.trim() ? `Email : ${props.footerEmail.trim()}` : "",
	]
		.filter(Boolean)
		.join(" | ");

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted-foreground">
					Aperçu — Certificat de Célibat
				</h3>
			</div>
			<div className="aspect-[210/297] w-full overflow-hidden rounded-md border border-border bg-white shadow-sm">
				<div className="flex h-full flex-col gap-2 p-4 text-[8px] leading-[1.3] text-neutral-800 [&_*]:!text-neutral-800">
					{/* Entête */}
					<div className="flex flex-col items-center gap-0.5 border-b border-neutral-200 pb-2 text-center">
						{lines.map((line, idx) => (
							<div key={idx} className="font-semibold uppercase">
								{line}
							</div>
						))}
						<div className="mt-1">---------------</div>
					</div>

					{/* Corps simulé */}
					<div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
						<div className="text-[7px]">N° ___/ARGPRERPGONUT/CAB/___</div>
						<div className="text-right text-[7px]">{city}, le __________</div>
						<div className="text-center text-[10px] font-bold uppercase">
							Certificat de célibat
						</div>
						<div className="text-justify text-[7px]">
							L'Ambassade certifie que la personne ci-désignée est célibataire
							et libre de tout engagement matrimonial, d'après ses déclarations
							et les registres dont dispose l'Ambassade.
						</div>
						<div className="mt-auto flex flex-col items-end gap-0.5 pt-2">
							<div className="text-[7px] italic">{title}</div>
							<div className="text-[7px] font-bold">{signer}</div>
						</div>
					</div>

					{/* Pied de page */}
					{(props.footerAddress.trim() || contactLine) ? (
						<div className="flex flex-col items-center gap-0.5 border-t border-neutral-200 pt-2 text-center text-neutral-500">
							{props.footerAddress.trim() ? (
								<div className="italic">{props.footerAddress.trim()}</div>
							) : null}
							{contactLine ? <div className="italic">{contactLine}</div> : null}
						</div>
					) : (
						<div className="flex flex-col items-center gap-0.5 border-t border-neutral-200 pt-2 text-center text-neutral-400">
							<div className="italic">
								CALLE ORENSE - 68 - 2° IZQ. - 28020 - MADRID – ESPAÑA
							</div>
							<div className="italic">
								TEL : (+34) 914 138 211 | Email : secretariagabon@gmail.com
							</div>
						</div>
					)}
				</div>
			</div>
			<p className="text-xs text-muted-foreground">
				Le sceau officiel du Gabon reste le même sur tous les documents,
				quelle que soit la représentation.
			</p>
		</div>
	);
}

function PageSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<Skeleton className="h-20 w-full" />
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
				<div className="flex flex-col gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-40 w-full rounded-xl" />
					))}
				</div>
				<Skeleton className="aspect-[210/297] w-full rounded-md" />
			</div>
		</div>
	);
}
