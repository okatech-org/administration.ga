"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { FileText, Import, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

interface ImportFromIDocumentDialogProps {
	open: boolean;
	onClose: () => void;
	correspondanceItemId: Id<"correspondanceItems">;
	orgId: Id<"orgs">;
}

export function ImportFromIDocumentDialog({
	open,
	onClose,
	correspondanceItemId,
	orgId,
}: ImportFromIDocumentDialogProps) {
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { data: docs, isPending } = useAuthenticatedConvexQuery(
		api.functions.documents.getByOwner,
		open ? { ownerId: orgId } : "skip",
	);

	const { mutateAsync: importDoc, isPending: isImporting } = useConvexMutationQuery(
		api.functions.correspondanceDocuments.importDocumentFromIDocument,
	);

	const filtered = useMemo(() => {
		const list = ((docs as any[]) ?? []).filter((d) => d.files?.length);
		if (!search.trim()) return list;
		const q = search.toLowerCase();
		return list.filter(
			(d) =>
				(d.label ?? "").toLowerCase().includes(q) ||
				(d.files?.[0]?.filename ?? "").toLowerCase().includes(q),
		);
	}, [docs, search]);

	const submit = async () => {
		if (!selectedId) return;
		try {
			await importDoc({
				correspondanceItemId,
				documentId: selectedId as Id<"documents">,
			});
			toast.success("Document importé depuis iDocument");
			onClose();
			setSelectedId(null);
		} catch (e: any) {
			toast.error(e?.message ?? "Erreur lors de l'import");
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Import className="h-4 w-4" />
						Importer depuis iDocument
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<p className="text-xs text-muted-foreground">
						Sélectionnez un document de la bibliothèque iDocument de
						l'organisation pour l'attacher à cette correspondance.
					</p>
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher un document…"
							disabled={isImporting}
							className="pl-8"
						/>
					</div>
					<div className="max-h-72 overflow-auto rounded-md border border-border/50">
						{isPending ? (
							<div className="flex items-center justify-center p-6">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
						) : filtered.length === 0 ? (
							<p className="p-4 text-center text-xs text-muted-foreground">
								Aucun document trouvé
							</p>
						) : (
							<ul className="divide-y divide-border/40">
								{filtered.map((d) => {
									const file = d.files?.[0];
									const selected = d._id === selectedId;
									return (
										<li key={d._id}>
											<button
												type="button"
												onClick={() => setSelectedId(d._id)}
												disabled={isImporting}
												className={cn(
													"flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40",
													selected && "bg-primary/10",
												)}
											>
												<div
													className={cn(
														"mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
														selected
															? "border-primary"
															: "border-muted-foreground/30",
													)}
												>
													{selected && (
														<div className="h-1.5 w-1.5 rounded-full bg-primary" />
													)}
												</div>
												<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium">
														{d.label ?? file?.filename ?? "Sans titre"}
													</p>
													<p className="truncate text-[11px] text-muted-foreground">
														{file?.filename}
														{file?.sizeBytes
															? ` · ${(file.sizeBytes / 1024).toFixed(0)} Ko`
															: ""}
													</p>
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isImporting}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						Annuler
					</Button>
					<Button onClick={submit} disabled={!selectedId || isImporting}>
						{isImporting ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Import className="mr-1.5 h-3.5 w-3.5" />
						)}
						Importer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
