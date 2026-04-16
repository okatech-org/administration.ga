"use client";

/**
 * Réutilisable — affiche la configuration de signature officielle pour un
 * agent. Utilisée depuis la page /settings (onglet Signature) et depuis la
 * route standalone /settings/signature.
 */

import { api } from "@convex/_generated/api";
import { FileSignature, Loader2, Save, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

const MAX_SIGNATURE_BYTES = 500 * 1024;

export function SignatureSettingsCard() {
	const { activeOrgId } = useOrg();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [title, setTitle] = useState("");
	const [uploading, setUploading] = useState(false);

	const { data: signature, isLoading } = useAuthenticatedConvexQuery(
		api.functions.signatures.getMySignature,
		activeOrgId ? { orgId: activeOrgId } : "skip",
	);

	const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
		api.functions.signatures.generateSignatureUploadUrl,
	);
	const { mutateAsync: setSignature } = useConvexMutationQuery(
		api.functions.signatures.setMySignature,
	);
	const { mutateAsync: clearSignature, isPending: clearing } = useConvexMutationQuery(
		api.functions.signatures.clearMySignature,
	);

	// Sync the title input with the persisted value as soon as it loads.
	useEffect(() => {
		if (signature?.title && title === "") setTitle(signature.title);
	}, [signature?.title, title]);

	async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file || !activeOrgId) return;
		if (file.type !== "image/png") {
			toast.error("Format invalide — utilise un PNG");
			return;
		}
		if (file.size > MAX_SIGNATURE_BYTES) {
			toast.error("Image trop lourde — 500 Ko max");
			return;
		}
		setUploading(true);
		try {
			const uploadUrl = await generateUploadUrl({ orgId: activeOrgId });
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!result.ok) throw new Error(`Upload failed (${result.status})`);
			const { storageId } = (await result.json()) as { storageId: string };
			await setSignature({
				orgId: activeOrgId,
				imageStorageId: storageId as never,
				title: title.trim() || undefined,
			});
			toast.success("Signature enregistrée");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec du téléversement";
			toast.error(message);
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	async function saveTitleOnly() {
		if (!activeOrgId || !signature?.imageStorageId) {
			toast.error("Téléverse d'abord une image de signature");
			return;
		}
		try {
			await setSignature({
				orgId: activeOrgId,
				imageStorageId: signature.imageStorageId,
				title: title.trim() || undefined,
			});
			toast.success("Titre mis à jour");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
		}
	}

	async function onClear() {
		if (!activeOrgId) return;
		if (!window.confirm("Supprimer définitivement la signature ?")) return;
		try {
			await clearSignature({ orgId: activeOrgId });
			toast.success("Signature supprimée");
			setTitle("");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Échec de la suppression");
		}
	}

	if (!activeOrgId) {
		return (
			<div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
				Aucune organisation active — sélectionne une représentation.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<FileSignature className="h-5 w-5" />
				</div>
				<div>
					<h2 className="text-lg font-semibold">Signature officielle</h2>
					<p className="text-sm text-muted-foreground">
						Elle sera apposée automatiquement sur les documents que tu signes.
					</p>
				</div>
			</header>

			<div className="flex flex-col gap-6 rounded-2xl border bg-background p-4 md:p-6">
				<div className="flex flex-col gap-2">
					<Label>Aperçu</Label>
					<div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed bg-muted/30 p-4">
						{isLoading ? (
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						) : signature?.url ? (
							<Image
								src={signature.url}
								alt="Signature officielle"
								width={320}
								height={120}
								className="max-h-[120px] max-w-[320px] object-contain"
								unoptimized
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								Aucune signature configurée
							</p>
						)}
					</div>
					{signature?.uploadedAt ? (
						<p className="text-xs text-muted-foreground">
							Téléversée le{" "}
							{new Date(signature.uploadedAt).toLocaleDateString("fr-FR", {
								day: "2-digit",
								month: "long",
								year: "numeric",
							})}
							{signature.positionCodeAtUpload
								? ` — position : ${signature.positionCodeAtUpload}`
								: null}
						</p>
					) : null}
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="signature-title">Titre (apposé sous la signature)</Label>
					<Input
						id="signature-title"
						placeholder="Le Consul Général"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png"
						className="hidden"
						onChange={onFileSelected}
					/>
					<Button
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Upload className="mr-2 h-4 w-4" />
						)}
						{uploading
							? "Téléversement…"
							: signature?.imageStorageId
								? "Remplacer l'image"
								: "Téléverser une signature PNG"}
					</Button>
					{signature?.imageStorageId ? (
						<>
							<Button variant="outline" onClick={saveTitleOnly}>
								<Save className="mr-2 h-4 w-4" />
								Enregistrer le titre
							</Button>
							<Button
								variant="ghost"
								className="text-destructive hover:bg-destructive/10 hover:text-destructive"
								onClick={onClear}
								disabled={clearing}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Supprimer
							</Button>
						</>
					) : null}
				</div>

				<p className="text-xs text-muted-foreground">
					PNG — fond transparent recommandé, 500 Ko max. L'image sera
					redimensionnée automatiquement pour tenir dans un cadre de
					220×50 pt sur la dernière page du document.
				</p>
			</div>
		</div>
	);
}
