"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	AlertTriangle,
	Building2,
	FileText,
	Forward,
	Loader2,
	Search,
	UserCheck,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

type Priority = "normal" | "urgent" | "confidentiel";
type Confidentialite = "standard" | "confidentiel" | "secret";

interface TransmitDialogItem {
	_id: Id<"correspondanceItems">;
	reference: string;
	title: string;
	priority?: Priority;
	confidentialite?: Confidentialite;
	documents: Array<{
		storageId: string;
		filename: string;
		label?: string;
		sizeBytes: number;
		isMainDocument?: boolean;
	}>;
}

interface TransmitDialogProps {
	open: boolean;
	onClose: () => void;
	item: TransmitDialogItem;
	currentOrgId: Id<"orgs">;
	onTransmitted?: (result: {
		mode: "assigned" | "forwarded";
		forwardCopyId?: Id<"correspondanceItems">;
	}) => void;
}

type TabMode = "agent" | "org";

export function TransmitDialog({
	open,
	onClose,
	item,
	currentOrgId,
	onTransmitted,
}: TransmitDialogProps) {
	const { t } = useTranslation();
	const [mode, setMode] = useState<TabMode>("agent");
	const [orgSearch, setOrgSearch] = useState("");
	const [selectedOrgId, setSelectedOrgId] = useState<Id<"orgs"> | null>(null);
	const [agentSearch, setAgentSearch] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState<Id<"users"> | null>(null);
	const [comment, setComment] = useState("");
	const [priority, setPriority] = useState<Priority>(item.priority ?? "normal");
	const [includeBordereau, setIncludeBordereau] = useState(true);
	const [confirmedConfidential, setConfirmedConfidential] = useState(false);
	const [documentIndices, setDocumentIndices] = useState<Set<number>>(
		() => new Set(item.documents.map((_, i) => i)),
	);

	// Liste des orgs (couvre les deux tabs : on choisit toujours une org)
	const { data: orgsData, isPending: orgsLoading } = useAuthenticatedConvexQuery(
		api.functions.contactSearch.listOrgsForContacts,
		open
			? {
					myOrgId: currentOrgId,
					scope: "all-diplomatic",
					searchTerm: orgSearch.trim() || undefined,
				}
			: "skip",
	);

	const orgs = useMemo(() => {
		const list = ((orgsData as any)?.orgs ?? []) as Array<{
			id: string;
			name: string;
			country?: string;
			type?: string;
			memberCount?: number;
			isMine?: boolean;
		}>;
		return list;
	}, [orgsData]);

	// Liste des agents de l'org sélectionnée (tab Agent)
	const { data: membersData, isPending: membersLoading } =
		useAuthenticatedConvexQuery(
			api.functions.contactSearch.listOrgMembers,
			open && mode === "agent" && selectedOrgId
				? {
						orgId: selectedOrgId,
						searchTerm: agentSearch.trim() || undefined,
						limit: 100,
					}
				: "skip",
		);

	const agents = useMemo(() => {
		const list = ((membersData as any)?.contacts ?? []) as Array<{
			id: string;
			userId: string;
			name: string;
			email?: string;
			position?: string;
			orgId: string;
			orgName: string;
		}>;
		return list;
	}, [membersData]);

	const { mutateAsync: transmit, isPending: isSubmitting } =
		useConvexMutationQuery(
			api.functions.correspondanceCore.transmitCorrespondance,
		);

	const isConfidential =
		item.confidentialite === "confidentiel" || item.confidentialite === "secret";
	const isCrossOrg =
		selectedOrgId !== null && (selectedOrgId as string) !== (currentOrgId as string);
	const needsConfidentialConfirm = isConfidential && isCrossOrg;
	const showBordereauToggle = isCrossOrg;

	const canSubmit =
		selectedOrgId !== null &&
		(mode === "org" || selectedAgentId !== null) &&
		documentIndices.size > 0 &&
		(!needsConfidentialConfirm || confirmedConfidential);

	const toggleDoc = (i: number) => {
		setDocumentIndices((prev) => {
			const next = new Set(prev);
			if (next.has(i)) next.delete(i);
			else next.add(i);
			return next;
		});
	};

	const reset = () => {
		setMode("agent");
		setOrgSearch("");
		setSelectedOrgId(null);
		setAgentSearch("");
		setSelectedAgentId(null);
		setComment("");
		setPriority(item.priority ?? "normal");
		setIncludeBordereau(true);
		setConfirmedConfidential(false);
		setDocumentIndices(new Set(item.documents.map((_, i) => i)));
	};

	const handleClose = () => {
		if (isSubmitting) return;
		reset();
		onClose();
	};

	const submit = async () => {
		if (!canSubmit || !selectedOrgId) return;
		try {
			const target =
				mode === "agent" && selectedAgentId
					? ({
							kind: "agent" as const,
							agentId: selectedAgentId,
							agentOrgId: selectedOrgId,
						})
					: ({
							kind: "org" as const,
							orgId: selectedOrgId,
							userId: selectedAgentId ?? undefined,
						});

			const result = await transmit({
				itemId: item._id,
				target,
				comment: comment.trim() || undefined,
				priority,
				documentIndices:
					documentIndices.size === item.documents.length
						? undefined
						: Array.from(documentIndices).sort((a, b) => a - b),
				includeBordereau: showBordereauToggle ? includeBordereau : undefined,
				confirmConfidential: needsConfidentialConfirm ? true : undefined,
			});

			toast.success(
				result.mode === "forwarded"
					? t("icorrespondance.transmit.toastForwarded")
					: t("icorrespondance.transmit.toastAssigned"),
			);
			onTransmitted?.({
				mode: result.mode,
				forwardCopyId:
					result.mode === "forwarded" ? result.forwardCopyId : undefined,
			});
			handleClose();
		} catch (e: any) {
			toast.error(e?.message ?? t("icorrespondance.transmit.toastError"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
				<DialogHeader className="border-b px-6 py-4">
					<DialogTitle className="flex items-center gap-2">
						<Forward className="h-4 w-4" />
						{t("icorrespondance.transmit.title")} — {item.reference}
					</DialogTitle>
					<DialogDescription>
						{t("icorrespondance.transmit.hint")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
					<Tabs
						value={mode}
						onValueChange={(v) => {
							setMode(v as TabMode);
							setSelectedAgentId(null);
						}}
					>
						<TabsList className="w-full">
							<TabsTrigger value="agent" className="flex-1 gap-1.5">
								<UserCheck className="h-3.5 w-3.5" />
								{t("icorrespondance.transmit.tabAgent")}
							</TabsTrigger>
							<TabsTrigger value="org" className="flex-1 gap-1.5">
								<Building2 className="h-3.5 w-3.5" />
								{t("icorrespondance.transmit.tabOrg")}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="agent" className="space-y-3 pt-3">
							<OrgPicker
								orgs={orgs}
								loading={orgsLoading}
								search={orgSearch}
								onSearchChange={setOrgSearch}
								selectedOrgId={selectedOrgId}
								onSelect={(id) => {
									setSelectedOrgId(id);
									setSelectedAgentId(null);
									setConfirmedConfidential(false);
								}}
								searchPlaceholder={t("icorrespondance.transmit.orgSearchPlaceholder")}
							/>
							{selectedOrgId ? (
								<AgentPicker
									agents={agents}
									loading={membersLoading}
									search={agentSearch}
									onSearchChange={setAgentSearch}
									selectedAgentId={selectedAgentId}
									onSelect={setSelectedAgentId}
									searchPlaceholder={t("icorrespondance.transmit.agentSearchPlaceholder")}
								/>
							) : null}
						</TabsContent>

						<TabsContent value="org" className="space-y-3 pt-3">
							<OrgPicker
								orgs={orgs}
								loading={orgsLoading}
								search={orgSearch}
								onSearchChange={setOrgSearch}
								selectedOrgId={selectedOrgId}
								onSelect={(id) => {
									setSelectedOrgId(id);
									setConfirmedConfidential(false);
								}}
								searchPlaceholder={t("icorrespondance.transmit.orgSearchPlaceholder")}
							/>
						</TabsContent>
					</Tabs>

					{/* Confidentialité — avertissement */}
					{needsConfidentialConfirm ? (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription className="space-y-2">
								<p className="text-xs">
									{t("icorrespondance.transmit.confidentialWarning")}
								</p>
								<label className="flex items-start gap-2 cursor-pointer text-xs">
									<Checkbox
										checked={confirmedConfidential}
										onCheckedChange={(v) => setConfirmedConfidential(v === true)}
										disabled={isSubmitting}
										className="mt-0.5"
									/>
									<span>{t("icorrespondance.transmit.confidentialConfirm")}</span>
								</label>
							</AlertDescription>
						</Alert>
					) : null}

					{/* Priorité */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">
								{t("icorrespondance.editDraft.priority")}
							</Label>
							<Select
								value={priority}
								onValueChange={(v) => setPriority(v as Priority)}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="normal">
										{t("icorrespondance.priority.normal")}
									</SelectItem>
									<SelectItem value="urgent">
										{t("icorrespondance.priority.urgent")}
									</SelectItem>
									<SelectItem value="confidentiel">
										{t("icorrespondance.priority.confidentiel")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{showBordereauToggle ? (
							<div className="space-y-1.5">
								<Label className="text-xs">
									{t("icorrespondance.transmit.includeBordereau")}
								</Label>
								<div className="flex items-center h-9 gap-2">
									<Switch
										checked={includeBordereau}
										onCheckedChange={setIncludeBordereau}
										disabled={isSubmitting}
									/>
									<span className="text-xs text-muted-foreground">
										{includeBordereau
											? t("icorrespondance.transmit.bordereauOn")
											: t("icorrespondance.transmit.bordereauOff")}
									</span>
								</div>
							</div>
						) : null}
					</div>

					{/* Commentaire */}
					<div className="space-y-1.5">
						<Label htmlFor="transmit-comment" className="text-xs">
							{t("icorrespondance.transmit.commentLabel")}
						</Label>
						<Textarea
							id="transmit-comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder={t("icorrespondance.transmit.commentPlaceholder")}
							rows={3}
							maxLength={500}
							disabled={isSubmitting}
							className="resize-none text-xs"
						/>
					</div>

					{/* Documents */}
					{item.documents.length > 0 ? (
						<div className="space-y-1.5">
							<Label className="text-xs">
								{t("icorrespondance.transmit.documentsLabel")} (
								{documentIndices.size}/{item.documents.length})
							</Label>
							<div className="rounded-md border border-border/50 divide-y divide-border/40 max-h-40 overflow-y-auto">
								{item.documents.map((doc, i) => {
									const checked = documentIndices.has(i);
									return (
										<label
											key={doc.storageId}
											className={cn(
												"flex items-center gap-2 px-3 py-2 cursor-pointer text-xs hover:bg-muted/30",
												checked && "bg-primary/5",
											)}
										>
											<Checkbox
												checked={checked}
												onCheckedChange={() => toggleDoc(i)}
												disabled={isSubmitting}
											/>
											<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<span className="truncate flex-1">
												{doc.label ?? doc.filename}
											</span>
											{doc.isMainDocument ? (
												<Badge variant="outline" className="text-[8px] shrink-0">
													{t("icorrespondance.detail.mainDocument")}
												</Badge>
											) : null}
										</label>
									);
								})}
							</div>
						</div>
					) : null}
				</div>

				<DialogFooter className="border-t px-6 py-3">
					<Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
						<X className="mr-1.5 h-3.5 w-3.5" />
						{t("icorrespondance.actions.cancel")}
					</Button>
					<Button onClick={submit} disabled={!canSubmit || isSubmitting}>
						{isSubmitting ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<Forward className="mr-1.5 h-3.5 w-3.5" />
						)}
						{t("icorrespondance.transmit.submit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Sous-composants pickers ─────────────────────────────────────────────────

interface OrgPickerProps {
	orgs: Array<{
		id: string;
		name: string;
		country?: string;
		type?: string;
		memberCount?: number;
		isMine?: boolean;
	}>;
	loading: boolean;
	search: string;
	onSearchChange: (v: string) => void;
	selectedOrgId: Id<"orgs"> | null;
	onSelect: (id: Id<"orgs">) => void;
	searchPlaceholder: string;
}

function OrgPicker({
	orgs,
	loading,
	search,
	onSearchChange,
	selectedOrgId,
	onSelect,
	searchPlaceholder,
}: OrgPickerProps) {
	return (
		<div className="space-y-2">
			<div className="relative">
				<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={searchPlaceholder}
					className="pl-8 h-9 text-xs"
				/>
			</div>
			<div className="max-h-44 overflow-auto rounded-md border border-border/50">
				{loading ? (
					<div className="flex items-center justify-center p-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : orgs.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">
						—
					</p>
				) : (
					<ul className="divide-y divide-border/40">
						{orgs.map((o) => {
							const selected = (selectedOrgId as string) === o.id;
							return (
								<li key={o.id}>
									<button
										type="button"
										onClick={() => onSelect(o.id as Id<"orgs">)}
										className={cn(
											"flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
											selected && "bg-primary/10",
										)}
									>
										<div
											className={cn(
												"flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
												selected
													? "border-primary"
													: "border-muted-foreground/30",
											)}
										>
											{selected && (
												<div className="h-1.5 w-1.5 rounded-full bg-primary" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{o.name}
												{o.isMine ? (
													<span className="ml-2 text-[10px] text-primary">
														(votre org)
													</span>
												) : null}
											</p>
											{(o.country || o.type) && (
												<p className="truncate text-[10px] text-muted-foreground">
													{[o.type, o.country].filter(Boolean).join(" · ")}
												</p>
											)}
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}

interface AgentPickerProps {
	agents: Array<{
		userId: string;
		name: string;
		email?: string;
		position?: string;
	}>;
	loading: boolean;
	search: string;
	onSearchChange: (v: string) => void;
	selectedAgentId: Id<"users"> | null;
	onSelect: (id: Id<"users">) => void;
	searchPlaceholder: string;
}

function AgentPicker({
	agents,
	loading,
	search,
	onSearchChange,
	selectedAgentId,
	onSelect,
	searchPlaceholder,
}: AgentPickerProps) {
	return (
		<div className="space-y-2">
			<div className="relative">
				<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={searchPlaceholder}
					className="pl-8 h-9 text-xs"
				/>
			</div>
			<div className="max-h-44 overflow-auto rounded-md border border-border/50">
				{loading ? (
					<div className="flex items-center justify-center p-6">
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					</div>
				) : agents.length === 0 ? (
					<p className="p-4 text-center text-xs text-muted-foreground">—</p>
				) : (
					<ul className="divide-y divide-border/40">
						{agents.map((a) => {
							const selected = (selectedAgentId as string) === a.userId;
							return (
								<li key={a.userId}>
									<button
										type="button"
										onClick={() => onSelect(a.userId as Id<"users">)}
										className={cn(
											"flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
											selected && "bg-primary/10",
										)}
									>
										<div
											className={cn(
												"flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2",
												selected
													? "border-primary"
													: "border-muted-foreground/30",
											)}
										>
											{selected && (
												<div className="h-1.5 w-1.5 rounded-full bg-primary" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">{a.name}</p>
											{(a.position || a.email) && (
												<p className="truncate text-[10px] text-muted-foreground">
													{a.position ?? a.email}
												</p>
											)}
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
