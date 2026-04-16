"use client";

/**
 * Create a new GLOBAL template (super-admin). Handles only metadata — content
 * is authored on the edit page after creation.
 */

import { api } from "@convex/_generated/api";
import { ServiceCategory } from "@convex/lib/constants";
import { FilePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FlatCard } from "@/components/design-system/flat-card";
import { PageHeader } from "@/components/design-system/page-header";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

type TemplateType = "certificate" | "attestation" | "receipt" | "letter" | "custom";

export default function NewGlobalTemplatePage() {
	const router = useRouter();
	const [nameFr, setNameFr] = useState("");
	const [descFr, setDescFr] = useState("");
	const [templateType, setTemplateType] = useState<TemplateType>("attestation");
	const [category, setCategory] = useState<string>(ServiceCategory.Certification);
	const [paperSize, setPaperSize] = useState<"A4" | "LETTER">("A4");
	const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
	const [autoPublishToCitizen, setAutoPublish] = useState(true);
	const [requireSignature, setRequireSignature] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const { mutateAsync: createTemplate } = useConvexMutationQuery(
		api.functions.documentTemplates.create,
	);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!nameFr.trim()) {
			toast.error("Saisis un nom en français");
			return;
		}
		setIsPending(true);
		try {
			const id = await createTemplate({
				name: descFr ? { fr: nameFr } : { fr: nameFr },
				description: descFr ? { fr: descFr } : undefined,
				category: category as never,
				templateType,
				content: {
					type: "doc",
					content: [{ type: "paragraph" }],
				},
				placeholders: [],
				isGlobal: true,
				paperSize,
				orientation,
			});
			toast.success("Modèle créé");
			router.push(`/config/templates/${id}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de la création";
			toast.error(message);
		} finally {
			setIsPending(false);
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			<PageHeader
				title="Nouveau modèle global"
				subtitle="Configuration initiale — le contenu se rédige à l'étape suivante"
				icon={<FilePlus />}
				showBackButton
			/>

			<FlatCard className="p-6">
				<form onSubmit={onSubmit} className="flex flex-col gap-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label htmlFor="nameFr">Nom (FR)</Label>
							<Input
								id="nameFr"
								value={nameFr}
								onChange={(e) => setNameFr(e.target.value)}
								placeholder="Attestation de résidence"
								required
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="templateType">Type</Label>
							<Select value={templateType} onValueChange={(v) => setTemplateType(v as TemplateType)}>
								<SelectTrigger id="templateType">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="certificate">Certificat</SelectItem>
									<SelectItem value="attestation">Attestation</SelectItem>
									<SelectItem value="receipt">Récépissé</SelectItem>
									<SelectItem value="letter">Lettre</SelectItem>
									<SelectItem value="custom">Personnalisé</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<Label htmlFor="descFr">Description (FR)</Label>
						<Textarea
							id="descFr"
							value={descFr}
							onChange={(e) => setDescFr(e.target.value)}
							placeholder="Courte description expliquant l'usage"
							rows={2}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex flex-col gap-1">
							<Label htmlFor="category">Catégorie</Label>
							<Select value={category} onValueChange={setCategory}>
								<SelectTrigger id="category">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(ServiceCategory).map(([k, v]) => (
										<SelectItem key={k} value={v}>
											{k}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="paperSize">Format</Label>
							<Select value={paperSize} onValueChange={(v) => setPaperSize(v as "A4" | "LETTER")}>
								<SelectTrigger id="paperSize">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="A4">A4</SelectItem>
									<SelectItem value="LETTER">US Letter</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="orientation">Orientation</Label>
							<Select
								value={orientation}
								onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}
							>
								<SelectTrigger id="orientation">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="portrait">Portrait</SelectItem>
									<SelectItem value="landscape">Paysage</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex flex-col gap-3 rounded-md border p-4">
						<div className="flex items-center justify-between gap-4">
							<div>
								<div className="font-medium">Publication automatique au citoyen</div>
								<div className="text-sm text-muted-foreground">
									Si activé, les documents générés apparaissent immédiatement pour le citoyen.
								</div>
							</div>
							<Switch checked={autoPublishToCitizen} onCheckedChange={setAutoPublish} />
						</div>
						<div className="flex items-center justify-between gap-4">
							<div>
								<div className="font-medium">Signature requise</div>
								<div className="text-sm text-muted-foreground">
									Empêche la publication tant que le document n'a pas été signé.
								</div>
							</div>
							<Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => router.back()}>
							Annuler
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Création…" : "Créer et rédiger"}
						</Button>
					</div>
				</form>
			</FlatCard>
		</div>
	);
}
