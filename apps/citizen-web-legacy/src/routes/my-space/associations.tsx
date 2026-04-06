import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AssociationRole, AssociationType } from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Building2,
	ChevronRight,
	Globe,
	Loader2,
	LogOut,
	Mail,
	Phone,
	Plus,
	Search,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
	useConvexQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

export const Route = createFileRoute("/my-space/associations")({
	component: AssociationsPage,
});

type Association = {
	_id: Id<"associations">;
	name: string;
	slug: string;
	associationType: AssociationType;
	description?: string;
	email?: string;
	phone?: string;
	website?: string;
	logoUrl?: string;
	myRole?: AssociationRole;
};

function AssociationsPage() {
	const { t } = useTranslation();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<AssociationType | "all">("all");

	const { data: myAssociations, isPending: isPendingMine } =
		useAuthenticatedConvexQuery(api.functions.associations.getMine, {});

	// Use search query when user types, otherwise use list with optional type filter
	const { data: searchResults, isPending: isPendingSearch } = useConvexQuery(
		api.functions.associations.search,
		searchQuery.trim().length > 0
			? {
					query: searchQuery.trim(),
					type: typeFilter !== "all" ? typeFilter : undefined,
				}
			: "skip",
	);

	const { data: allAssociations, isPending: isPendingAll } = useConvexQuery(
		api.functions.associations.list,
		searchQuery.trim().length === 0
			? { type: typeFilter !== "all" ? typeFilter : undefined }
			: "skip",
	);

	const isPending =
		isPendingMine || (searchQuery.trim() ? isPendingSearch : isPendingAll);

	const myAssociationIds = new Set((myAssociations ?? []).map((a) => a._id));
	const discoverAssociations = useMemo(() => {
		const source = searchQuery.trim()
			? (searchResults ?? [])
			: (allAssociations ?? []);
		return source.filter((a) => !myAssociationIds.has(a._id));
	}, [searchQuery, searchResults, allAssociations, myAssociationIds]);

	const associationTypeLabels: Record<AssociationType, string> = {
		[AssociationType.Cultural]: t("associations.type.cultural"),
		[AssociationType.Sports]: t("associations.type.sports"),
		[AssociationType.Religious]: t("associations.type.religious"),
		[AssociationType.Professional]: t(
			"associations.type.professional",
			"Professionnelle",
		),
		[AssociationType.Solidarity]: t(
			"associations.type.solidarity",
			"Solidarité",
		),
		[AssociationType.Education]: t("associations.type.education"),
		[AssociationType.Youth]: t("associations.type.youth"),
		[AssociationType.Women]: t("associations.type.women"),
		[AssociationType.Student]: t("associations.type.student"),
		[AssociationType.Other]: t("associations.type.other"),
	};

	if (isPending && !myAssociations) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
			>
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Users className="h-6 w-6 text-primary" />
						{t("associations.title")}
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t("associations.subtitle")}
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							{t("associations.create.title")}
						</Button>
					</DialogTrigger>
					<CreateAssociationDialog
						onClose={() => setIsCreateDialogOpen(false)}
					/>
				</Dialog>
			</motion.div>

			<Tabs defaultValue="discover" className="space-y-4">
				<TabsList>
					<TabsTrigger value="discover" className="gap-2">
						<Globe className="h-4 w-4" />
						{t("associations.tabs.discover")}
					</TabsTrigger>
					<TabsTrigger value="mine" className="gap-2">
						<Users className="h-4 w-4" />
						{t("associations.tabs.mine")}
						{myAssociations && myAssociations.length > 0 && (
							<Badge variant="secondary" className="ml-1">
								{myAssociations.length}
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				{/* My Associations */}
				<TabsContent value="mine">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2 }}
					>
						{myAssociations && myAssociations.length > 0 ? (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{myAssociations.map((association) => (
									<MyAssociationCard
										key={association._id}
										association={association as Association}
									/>
								))}
							</div>
						) : (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12">
									<Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
									<h3 className="text-lg font-medium text-muted-foreground">
										{t("associations.empty.mine.title")}
									</h3>
									<p className="text-sm text-muted-foreground text-center mt-1">
										{t(
											"associations.empty.mine.description",
											"Créez ou rejoignez une association pour la voir ici.",
										)}
									</p>
								</CardContent>
							</Card>
						)}
					</motion.div>
				</TabsContent>

				{/* Discover Associations */}
				<TabsContent value="discover">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2 }}
						className="space-y-4"
					>
						{/* Search bar + type filter */}
						<div className="space-y-3">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={t(
										"associations.search.placeholder",
										"Rechercher une association...",
									)}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge
									variant={typeFilter === "all" ? "default" : "outline"}
									className="cursor-pointer select-none transition-colors"
									onClick={() => setTypeFilter("all")}
								>
									{t("associations.filter.all")}
								</Badge>
								{Object.values(AssociationType).map((type) => (
									<Badge
										key={type}
										variant={typeFilter === type ? "default" : "outline"}
										className="cursor-pointer select-none transition-colors"
										onClick={() => setTypeFilter(type)}
									>
										{associationTypeLabels[type]}
									</Badge>
								))}
							</div>
						</div>

						{/* Results */}
						{isPending ? (
							<div className="flex items-center justify-center h-32">
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
							</div>
						) : discoverAssociations.length > 0 ? (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{discoverAssociations.map((association) => (
									<DiscoverAssociationCard
										key={association._id}
										association={association as Association}
									/>
								))}
							</div>
						) : (
							<Card>
								<CardContent className="flex flex-col items-center justify-center py-12">
									<Globe className="h-16 w-16 text-muted-foreground/30 mb-4" />
									<h3 className="text-lg font-medium text-muted-foreground">
										{searchQuery.trim()
											? t("associations.empty.search")
											: t(
													"associations.empty.discover.title",
													"Aucune association disponible",
												)}
									</h3>
									<p className="text-sm text-muted-foreground text-center mt-1">
										{searchQuery.trim()
											? t(
													"associations.empty.searchHint",
													"Essayez avec un autre terme de recherche",
												)
											: t(
													"associations.empty.discover.description",
													"Soyez le premier à créer une association!",
												)}
									</p>
								</CardContent>
							</Card>
						)}
					</motion.div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function MyAssociationCard({ association }: { association: Association }) {
	const { t } = useTranslation();
	const { mutate: leave, isPending: isLeaving } = useConvexMutationQuery(
		api.functions.associations.leave,
	);
	const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

	const associationTypeLabels: Record<AssociationType, string> = {
		[AssociationType.Cultural]: t("associations.type.cultural"),
		[AssociationType.Sports]: t("associations.type.sports"),
		[AssociationType.Religious]: t("associations.type.religious"),
		[AssociationType.Professional]: t(
			"associations.type.professional",
			"Professionnelle",
		),
		[AssociationType.Solidarity]: t(
			"associations.type.solidarity",
			"Solidarité",
		),
		[AssociationType.Education]: t("associations.type.education"),
		[AssociationType.Youth]: t("associations.type.youth"),
		[AssociationType.Women]: t("associations.type.women"),
		[AssociationType.Student]: t("associations.type.student"),
		[AssociationType.Other]: t("associations.type.other"),
	};

	const roleLabels: Partial<Record<AssociationRole, string>> = {
		[AssociationRole.President]: t("associations.role.president"),
		[AssociationRole.VicePresident]: t(
			"associations.role.vicePresident",
			"Vice-Président",
		),
		[AssociationRole.Secretary]: t("associations.role.secretary"),
		[AssociationRole.Treasurer]: t("associations.role.treasurer"),
		[AssociationRole.Member]: t("associations.role.member"),
	};

	const getRoleLabel = (role: AssociationRole): string => {
		return roleLabels[role] ?? t("associations.role.member");
	};

	const handleLeave = () => {
		leave(
			{
				associationId: association._id as unknown as Id<"associations">,
			},
			{
				onSuccess: () => {
					toast.success(t("associations.left"));
					setShowLeaveConfirm(false);
				},
				onError: () => toast.error(t("common.error")),
			},
		);
	};

	return (
		<Card className="group hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
							{association.logoUrl ? (
								<img
									src={association.logoUrl}
									alt={association.name}
									className="h-10 w-10 rounded object-cover"
								/>
							) : (
								<Building2 className="h-6 w-6 text-primary" />
							)}
						</div>
						<div>
							<CardTitle className="text-lg">{association.name}</CardTitle>
							<Badge variant="secondary" className="mt-1">
								{associationTypeLabels[association.associationType]}
							</Badge>
						</div>
					</div>
					{association.myRole && (
						<Badge
							variant="outline"
							className="bg-primary/10 text-primary border-primary/30"
						>
							{getRoleLabel(association.myRole)}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{association.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{association.description}
					</p>
				)}
				<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
					{association.email && (
						<div className="flex items-center gap-1">
							<Mail className="h-3.5 w-3.5" />
							<span className="truncate max-w-[150px]">
								{association.email}
							</span>
						</div>
					)}
					{association.phone && (
						<div className="flex items-center gap-1">
							<Phone className="h-3.5 w-3.5" />
							<span>{association.phone}</span>
						</div>
					)}
				</div>
				<div className="flex gap-2 pt-2">
					<Button variant="outline" size="sm" className="flex-1" asChild>
						<Link
							to="/my-space/associations/$slug"
							params={{ slug: association.slug }}
						>
							{t("common.view")}
						</Link>
					</Button>
					<Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive hover:bg-destructive/10"
							>
								<LogOut className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t("associations.leave.title")}</DialogTitle>
							</DialogHeader>
							<p className="text-muted-foreground">
								{t(
									"associations.leave.description",
									"Vous ne serez plus membre de {{name}}. Vous pourrez rejoindre à nouveau plus tard.",
									{ name: association.name },
								)}
							</p>
							<div className="flex justify-end gap-2 mt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowLeaveConfirm(false)}
								>
									{t("common.cancel")}
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={handleLeave}
									disabled={isLeaving}
								>
									{isLeaving && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									{t("associations.leave.confirm")}
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</CardContent>
		</Card>
	);
}

function DiscoverAssociationCard({
	association,
}: {
	association: Association;
}) {
	const { t } = useTranslation();

	const associationTypeLabels: Record<AssociationType, string> = {
		[AssociationType.Cultural]: t("associations.type.cultural"),
		[AssociationType.Sports]: t("associations.type.sports"),
		[AssociationType.Religious]: t("associations.type.religious"),
		[AssociationType.Professional]: t(
			"associations.type.professional",
			"Professionnelle",
		),
		[AssociationType.Solidarity]: t(
			"associations.type.solidarity",
			"Solidarité",
		),
		[AssociationType.Education]: t("associations.type.education"),
		[AssociationType.Youth]: t("associations.type.youth"),
		[AssociationType.Women]: t("associations.type.women"),
		[AssociationType.Student]: t("associations.type.student"),
		[AssociationType.Other]: t("associations.type.other"),
	};

	return (
		<Link
			to="/my-space/associations/$slug"
			params={{ slug: association.slug }}
			className="block"
		>
			<Card className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full overflow-hidden">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
							{association.logoUrl ? (
								<img
									src={association.logoUrl}
									alt={association.name}
									className="h-8 w-8 rounded object-cover"
								/>
							) : (
								<Building2 className="h-5 w-5 text-primary" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2 leading-tight">
								{association.name}
							</CardTitle>
							<Badge variant="secondary" className="mt-1 text-xs">
								{associationTypeLabels[association.associationType]}
							</Badge>
						</div>
						<ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
					</div>
				</CardHeader>
				<CardContent>
					{association.description && (
						<p className="text-sm text-muted-foreground line-clamp-2">
							{association.description}
						</p>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}

function CreateAssociationDialog({ onClose }: { onClose: () => void }) {
	const { t } = useTranslation();
	const { mutate: create, isPending } = useConvexMutationQuery(
		api.functions.associations.create,
	);

	const [formData, setFormData] = useState({
		name: "",
		associationType: "" as AssociationType | "",
		description: "",
		email: "",
		phone: "",
		website: "",
	});

	const associationTypeLabels: Record<AssociationType, string> = {
		[AssociationType.Cultural]: t("associations.type.cultural"),
		[AssociationType.Sports]: t("associations.type.sports"),
		[AssociationType.Religious]: t("associations.type.religious"),
		[AssociationType.Professional]: t(
			"associations.type.professional",
			"Professionnelle",
		),
		[AssociationType.Solidarity]: t(
			"associations.type.solidarity",
			"Solidarité",
		),
		[AssociationType.Education]: t("associations.type.education"),
		[AssociationType.Youth]: t("associations.type.youth"),
		[AssociationType.Women]: t("associations.type.women"),
		[AssociationType.Student]: t("associations.type.student"),
		[AssociationType.Other]: t("associations.type.other"),
	};

	const handleSubmit = () => {
		if (!formData.associationType) return;
		create(
			{
				name: formData.name,
				associationType: formData.associationType,
				description: formData.description || undefined,
				email: formData.email || undefined,
				phone: formData.phone || undefined,
				website: formData.website || undefined,
			},
			{
				onSuccess: () => {
					captureEvent("myspace_association_joined");
					toast.success(t("associations.created"));
					onClose();
				},
				onError: () => toast.error(t("common.error")),
			},
		);
	};

	return (
		<DialogContent className="sm:max-w-[500px]">
			<DialogHeader>
				<DialogTitle>{t("associations.create.title")}</DialogTitle>
			</DialogHeader>
			<div className="space-y-4 mt-4">
				<div className="space-y-2">
					<Label>{t("associations.form.name")} *</Label>
					<Input
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						placeholder="Association des Gabonais de Paris"
					/>
				</div>
				<div className="space-y-2">
					<Label>{t("associations.form.type")} *</Label>
					<Select
						value={formData.associationType}
						onValueChange={(v) =>
							setFormData({
								...formData,
								associationType: v as AssociationType,
							})
						}
					>
						<SelectTrigger>
							<SelectValue placeholder={t("common.select")} />
						</SelectTrigger>
						<SelectContent>
							{Object.values(AssociationType).map((type) => (
								<SelectItem key={type} value={type}>
									{associationTypeLabels[type]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>{t("associations.form.description")}</Label>
					<Textarea
						value={formData.description}
						onChange={(e) =>
							setFormData({ ...formData, description: e.target.value })
						}
						placeholder="Décrivez l'objectif de votre association..."
						rows={3}
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>{t("associations.form.email")}</Label>
						<Input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="contact@association.org"
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("associations.form.phone")}</Label>
						<Input
							value={formData.phone}
							onChange={(e) =>
								setFormData({ ...formData, phone: e.target.value })
							}
							placeholder="+33 1 23 45 67 89"
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label>{t("associations.form.website")}</Label>
					<Input
						value={formData.website}
						onChange={(e) =>
							setFormData({ ...formData, website: e.target.value })
						}
						placeholder="https://www.association.org"
					/>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={onClose}>
						{t("common.cancel")}
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={isPending || !formData.name || !formData.associationType}
					>
						{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{t("common.create")}
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}
