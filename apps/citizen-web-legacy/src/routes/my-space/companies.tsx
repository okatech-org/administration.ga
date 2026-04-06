import { api } from "@convex/_generated/api";
import {
	ActivitySector,
	CompanyRole,
	CompanyType,
} from "@convex/lib/constants";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Briefcase,
	Building,
	Building2,
	ChevronRight,
	ExternalLink,
	Globe,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Plus,
	Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export const Route = createFileRoute("/my-space/companies")({
	component: CompaniesPage,
});

// Type for company from API — now uses dedicated `companies` table
type Company = {
	_id: string;
	name: string;
	slug: string;
	companyType: CompanyType;
	activitySector: ActivitySector;
	description?: string;
	email?: string;
	phone?: string;
	website?: string;
	logoUrl?: string;
	address?: {
		street?: string;
		city?: string;
		postalCode?: string;
		country?: string;
	};
	myRole?: CompanyRole;
	memberCount?: number;
};

function CompaniesPage() {
	const { t } = useTranslation();
	const [showCreate, setShowCreate] = useState(false);

	const { data: myCompanies, isPending: isPendingMine } =
		useAuthenticatedConvexQuery(api.functions.companies.getMine, {});
	const { data: allCompanies, isPending: isPendingAll } = useConvexQuery(
		api.functions.companies.list,
		{ limit: 50 },
	);

	return (
		<div className="space-y-6">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex items-start justify-between gap-4"
			>
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Building2 className="h-6 w-6 text-primary" />
						{t("companies.title")}
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						{t(
							"companies.description",
							"Gérez vos entreprises et découvrez les sociétés gabonaises",
						)}
					</p>
				</div>
				<Dialog open={showCreate} onOpenChange={setShowCreate}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							{t("companies.create.button")}
						</Button>
					</DialogTrigger>
					<CreateCompanyDialog onClose={() => setShowCreate(false)} />
				</Dialog>
			</motion.div>

			<Tabs defaultValue="mine" className="space-y-4">
				<TabsList>
					<TabsTrigger value="mine" className="gap-2">
						<Briefcase className="h-4 w-4" />
						{t("companies.tabs.mine")}
						{myCompanies && myCompanies.length > 0 && (
							<Badge variant="secondary" className="ml-1">
								{myCompanies.length}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="discover" className="gap-2">
						<Sparkles className="h-4 w-4" />
						{t("companies.tabs.discover")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="mine">
					{isPendingMine ? (
						<div className="flex justify-center p-8">
							<Loader2 className="animate-spin h-8 w-8 text-primary" />
						</div>
					) : !myCompanies || myCompanies.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<Building className="h-12 w-12 text-muted-foreground/30 mb-4" />
								<h3 className="font-semibold text-lg mb-2">
									{t("companies.empty.title")}
								</h3>
								<p className="text-muted-foreground text-sm max-w-md mb-4">
									{t(
										"companies.empty.description",
										"Vous n'êtes membre d'aucune entreprise. Créez votre première entreprise pour commencer.",
									)}
								</p>
								<Button onClick={() => setShowCreate(true)} className="gap-2">
									<Plus className="h-4 w-4" />
									{t("companies.create.button")}
								</Button>
							</CardContent>
						</Card>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.2 }}
							className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
						>
							{myCompanies.map((company) => (
								<MyCompanyCard key={company._id} company={company as Company} />
							))}
						</motion.div>
					)}
				</TabsContent>

				<TabsContent value="discover">
					{isPendingAll ? (
						<div className="flex justify-center p-8">
							<Loader2 className="animate-spin h-8 w-8 text-primary" />
						</div>
					) : !allCompanies || allCompanies.length === 0 ? (
						<Alert>
							<Building className="h-4 w-4" />
							<AlertTitle>{t("companies.discover.empty")}</AlertTitle>
							<AlertDescription>
								{t(
									"companies.discover.emptyDesc",
									"Il n'y a pas encore d'entreprises dans l'annuaire.",
								)}
							</AlertDescription>
						</Alert>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.2 }}
							className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
						>
							{allCompanies.map((company) => (
								<DiscoverCompanyCard
									key={company._id}
									company={company as Company}
								/>
							))}
						</motion.div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

function MyCompanyCard({ company }: { company: Company }) {
	const { t } = useTranslation();

	const companyTypeLabels: Record<CompanyType, string> = {
		[CompanyType.SARL]: "SARL",
		[CompanyType.SA]: "SA",
		[CompanyType.SAS]: "SAS",
		[CompanyType.SASU]: "SASU",
		[CompanyType.EURL]: "EURL",
		[CompanyType.EI]: t("companies.type.ei"),
		[CompanyType.AutoEntrepreneur]: t(
			"companies.type.auto",
			"Auto-Entrepreneur",
		),
		[CompanyType.Other]: t("companies.type.other"),
	};

	const sectorLabels: Record<ActivitySector, string> = {
		[ActivitySector.Technology]: t(
			"companies.sector.technology",
			"Technologie",
		),
		[ActivitySector.Commerce]: t("companies.sector.commerce"),
		[ActivitySector.Services]: t("companies.sector.services"),
		[ActivitySector.Industry]: t("companies.sector.industry"),
		[ActivitySector.Agriculture]: t(
			"companies.sector.agriculture",
			"Agriculture",
		),
		[ActivitySector.Health]: t("companies.sector.health"),
		[ActivitySector.Education]: t("companies.sector.education"),
		[ActivitySector.Culture]: t("companies.sector.culture"),
		[ActivitySector.Tourism]: t("companies.sector.tourism"),
		[ActivitySector.Transport]: t("companies.sector.transport"),
		[ActivitySector.Construction]: t(
			"companies.sector.construction",
			"Construction",
		),
		[ActivitySector.Other]: t("companies.sector.other"),
	};

	const roleLabels: Partial<Record<CompanyRole, string>> = {
		[CompanyRole.CEO]: t("companies.role.ceo"),
		[CompanyRole.Owner]: t("companies.role.owner"),
		[CompanyRole.President]: t("companies.role.president"),
		[CompanyRole.Director]: t("companies.role.director"),
		[CompanyRole.Manager]: t("companies.role.manager"),
	};

	const getRoleLabel = (role: CompanyRole): string => {
		return roleLabels[role] ?? t("companies.role.member");
	};

	return (
		<Card className="group hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
							{company.logoUrl ? (
								<img
									src={company.logoUrl}
									alt={company.name}
									className="h-10 w-10 rounded object-cover"
								/>
							) : (
								<Building2 className="h-6 w-6 text-primary" />
							)}
						</div>
						<div>
							<CardTitle className="text-lg">{company.name}</CardTitle>
							<div className="flex gap-1 flex-wrap mt-1">
								<Badge variant="secondary" className="text-xs">
									{companyTypeLabels[company.companyType]}
								</Badge>
								<Badge variant="outline" className="text-xs">
									{sectorLabels[company.activitySector]}
								</Badge>
							</div>
						</div>
					</div>
					{company.myRole && (
						<Badge
							variant="outline"
							className="bg-primary/10 text-primary border-primary/30"
						>
							{getRoleLabel(company.myRole)}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{company.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{company.description}
					</p>
				)}
				<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
					{company.address?.city && (
						<div className="flex items-center gap-1">
							<MapPin className="h-3.5 w-3.5" />
							<span>{company.address.city}</span>
						</div>
					)}
					{company.email && (
						<div className="flex items-center gap-1">
							<Mail className="h-3.5 w-3.5" />
							<span className="truncate max-w-[150px]">{company.email}</span>
						</div>
					)}
					{company.phone && (
						<div className="flex items-center gap-1">
							<Phone className="h-3.5 w-3.5" />
							<span>{company.phone}</span>
						</div>
					)}
				</div>
				<div className="flex gap-2 pt-2">
					<Button variant="outline" size="sm" className="flex-1" asChild>
						<Link to="/my-space/companies/$id" params={{ id: company._id }}>
							{t("common.view")}
							<ChevronRight className="h-4 w-4 ml-1" />
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function DiscoverCompanyCard({ company }: { company: Company }) {
	const { t } = useTranslation();

	const sectorLabels: Record<ActivitySector, string> = {
		[ActivitySector.Technology]: t(
			"companies.sector.technology",
			"Technologie",
		),
		[ActivitySector.Commerce]: t("companies.sector.commerce"),
		[ActivitySector.Services]: t("companies.sector.services"),
		[ActivitySector.Industry]: t("companies.sector.industry"),
		[ActivitySector.Agriculture]: t(
			"companies.sector.agriculture",
			"Agriculture",
		),
		[ActivitySector.Health]: t("companies.sector.health"),
		[ActivitySector.Education]: t("companies.sector.education"),
		[ActivitySector.Culture]: t("companies.sector.culture"),
		[ActivitySector.Tourism]: t("companies.sector.tourism"),
		[ActivitySector.Transport]: t("companies.sector.transport"),
		[ActivitySector.Construction]: t(
			"companies.sector.construction",
			"Construction",
		),
		[ActivitySector.Other]: t("companies.sector.other"),
	};

	return (
		<Card className="group hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
						{company.logoUrl ? (
							<img
								src={company.logoUrl}
								alt={company.name}
								className="h-10 w-10 rounded object-cover"
							/>
						) : (
							<Building className="h-6 w-6 text-muted-foreground" />
						)}
					</div>
					<div>
						<CardTitle className="text-lg">{company.name}</CardTitle>
						<Badge variant="secondary" className="mt-1">
							{sectorLabels[company.activitySector]}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{company.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{company.description}
					</p>
				)}
				<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
					{company.address?.city && (
						<div className="flex items-center gap-1">
							<MapPin className="h-3.5 w-3.5" />
							<span>{company.address.city}</span>
						</div>
					)}
					{company.website && (
						<a
							href={company.website}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 text-primary hover:underline"
						>
							<Globe className="h-3.5 w-3.5" />
							{t("companies.website")}
							<ExternalLink className="h-3 w-3" />
						</a>
					)}
				</div>
				{company.memberCount !== undefined && (
					<p className="text-xs text-muted-foreground">
						{t("companies.memberCount", "{{count}} membre(s)", {
							count: company.memberCount,
						})}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function CreateCompanyDialog({ onClose }: { onClose: () => void }) {
	const { t } = useTranslation();
	const { mutate: create, isPending } = useConvexMutationQuery(
		api.functions.companies.create,
	);

	const [formData, setFormData] = useState({
		name: "",
		companyType: "" as CompanyType | "",
		activitySector: "" as ActivitySector | "",
		description: "",
		email: "",
		phone: "",
		website: "",
		city: "",
	});

	const companyTypeLabels: Record<CompanyType, string> = {
		[CompanyType.SARL]: "SARL",
		[CompanyType.SA]: "SA",
		[CompanyType.SAS]: "SAS",
		[CompanyType.SASU]: "SASU",
		[CompanyType.EURL]: "EURL",
		[CompanyType.EI]: t("companies.type.ei"),
		[CompanyType.AutoEntrepreneur]: t(
			"companies.type.auto",
			"Auto-Entrepreneur",
		),
		[CompanyType.Other]: t("companies.type.other"),
	};

	const sectorLabels: Record<ActivitySector, string> = {
		[ActivitySector.Technology]: t(
			"companies.sector.technology",
			"Technologie",
		),
		[ActivitySector.Commerce]: t("companies.sector.commerce"),
		[ActivitySector.Services]: t("companies.sector.services"),
		[ActivitySector.Industry]: t("companies.sector.industry"),
		[ActivitySector.Agriculture]: t(
			"companies.sector.agriculture",
			"Agriculture",
		),
		[ActivitySector.Health]: t("companies.sector.health"),
		[ActivitySector.Education]: t("companies.sector.education"),
		[ActivitySector.Culture]: t("companies.sector.culture"),
		[ActivitySector.Tourism]: t("companies.sector.tourism"),
		[ActivitySector.Transport]: t("companies.sector.transport"),
		[ActivitySector.Construction]: t(
			"companies.sector.construction",
			"Construction",
		),
		[ActivitySector.Other]: t("companies.sector.other"),
	};

	const handleSubmit = () => {
		if (!formData.companyType || !formData.activitySector) return;
		create(
			{
				name: formData.name,
				companyType: formData.companyType,
				activitySector: formData.activitySector,
				description: formData.description || undefined,
				email: formData.email || undefined,
				phone: formData.phone || undefined,
				website: formData.website || undefined,
				address: formData.city
					? { street: "", city: formData.city, postalCode: "", country: "GA" }
					: undefined,
			},
			{
				onSuccess: () => {
					captureEvent("myspace_company_registered");
					toast.success(t("companies.created"));
					onClose();
				},
				onError: () => toast.error(t("common.error")),
			},
		);
	};

	return (
		<DialogContent className="sm:max-w-[500px]">
			<DialogHeader>
				<DialogTitle>{t("companies.create.title")}</DialogTitle>
			</DialogHeader>
			<div className="space-y-4 mt-4">
				<div className="space-y-2">
					<Label>{t("companies.form.name")} *</Label>
					<Input
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						placeholder="Ma Société SARL"
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>{t("companies.form.type")} *</Label>
						<Select
							value={formData.companyType}
							onValueChange={(v) =>
								setFormData({
									...formData,
									companyType: v as CompanyType,
								})
							}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("common.select")} />
							</SelectTrigger>
							<SelectContent>
								{Object.values(CompanyType).map((type) => (
									<SelectItem key={type} value={type}>
										{companyTypeLabels[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>{t("companies.form.sector")} *</Label>
						<Select
							value={formData.activitySector}
							onValueChange={(v) =>
								setFormData({
									...formData,
									activitySector: v as ActivitySector,
								})
							}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("common.select")} />
							</SelectTrigger>
							<SelectContent>
								{Object.values(ActivitySector).map((sector) => (
									<SelectItem key={sector} value={sector}>
										{sectorLabels[sector]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="space-y-2">
					<Label>{t("companies.form.description")}</Label>
					<Textarea
						value={formData.description}
						onChange={(e) =>
							setFormData({ ...formData, description: e.target.value })
						}
						placeholder="Décrivez l'activité de votre entreprise..."
						rows={3}
					/>
				</div>
				<div className="space-y-2">
					<Label>{t("companies.form.city")}</Label>
					<Input
						value={formData.city}
						onChange={(e) => setFormData({ ...formData, city: e.target.value })}
						placeholder="Libreville"
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>{t("companies.form.email")}</Label>
						<Input
							type="email"
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
							placeholder="contact@entreprise.ga"
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("companies.form.phone")}</Label>
						<Input
							value={formData.phone}
							onChange={(e) =>
								setFormData({ ...formData, phone: e.target.value })
							}
							placeholder="+241 00 00 00 00"
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label>{t("companies.form.website")}</Label>
					<Input
						value={formData.website}
						onChange={(e) =>
							setFormData({ ...formData, website: e.target.value })
						}
						placeholder="https://www.entreprise.ga"
					/>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={onClose}>
						{t("common.cancel")}
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={
							isPending ||
							!formData.name ||
							!formData.companyType ||
							!formData.activitySector
						}
					>
						{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{t("common.create")}
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}
