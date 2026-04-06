"use client";

import { api } from "@convex/_generated/api";
import type { ParentalRole } from "@convex/lib/constants";
import { ChildProfileStatus, Gender } from "@convex/lib/constants";
import { useRouter } from "next/navigation";
import {
	Baby,
	Calendar,
	Eye,
	Loader2,
	MapPin,
	Plus,
	Trash2,
	User,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/my-space/empty-state";
import { FlatCard } from "@/components/my-space/flat-card";
import { PageHeader } from "@/components/my-space/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { captureEvent } from "@/lib/analytics";

type ChildProfile = {
	_id: string;
	status: ChildProfileStatus;
	identity: {
		firstName: string;
		lastName: string;
		birthDate?: number;
		birthPlace?: string;
		gender?: Gender;
	};
	parents: Array<{
		role: ParentalRole;
		firstName: string;
		lastName: string;
	}>;
};

export default function ChildrenPage() {
	const { t } = useTranslation();
	const { data: children, isPending } = useAuthenticatedConvexQuery(
		api.functions.childProfiles.getMine,
		{},
	);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	const activeChildren = (children ?? []).filter(
		(c) => c.status !== ChildProfileStatus.Inactive,
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("children.title")}
				subtitle={t("children.subtitle")}
				icon={<Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />}
				iconBgClass="bg-pink-500/10"
				actions={
					<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								{t("children.add.button", "Ajouter un enfant")}
							</Button>
						</DialogTrigger>
						<AddChildDialog onClose={() => setIsAddDialogOpen(false)} />
					</Dialog>
				}
			/>

			{/* Children List */}
			{activeChildren.length === 0 ? (
				<FlatCard>
					<EmptyState
						icon={<Baby />}
						title={t("children.empty.title")}
						description={t(
							"children.empty.description",
							"Ajoutez vos enfants mineurs pour gerer leurs demarches consulaires.",
						)}
					/>
				</FlatCard>
			) : (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2, delay: 0.1 }}
					className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
				>
					{activeChildren.map((child, index) => (
						<ChildCard
							key={child._id}
							child={child as ChildProfile}
							index={index}
						/>
					))}
				</motion.div>
			)}
		</div>
	);
}

function ChildCard({ child, index }: { child: ChildProfile; index: number }) {
	const { t } = useTranslation();
	const router = useRouter();
	const { mutate: remove, isPending: isRemoving } = useConvexMutationQuery(
		api.functions.childProfiles.remove,
	);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const statusLabels: Record<ChildProfileStatus, string> = {
		[ChildProfileStatus.Draft]: t("children.status.draft"),
		[ChildProfileStatus.Pending]: t("children.status.pending"),
		[ChildProfileStatus.Active]: t("children.status.active"),
		[ChildProfileStatus.Inactive]: t("children.status.inactive"),
	};

	const statusColors: Record<ChildProfileStatus, string> = {
		[ChildProfileStatus.Draft]:
			"bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
		[ChildProfileStatus.Pending]:
			"bg-amber-500/10 text-amber-600 border-amber-500/20",
		[ChildProfileStatus.Active]:
			"bg-green-500/10 text-green-600 border-green-500/20",
		[ChildProfileStatus.Inactive]:
			"bg-red-500/10 text-red-600 border-red-500/20",
	};

	const calculateAge = (birthDate?: number): string => {
		if (!birthDate) return t("children.age.unknown");
		const today = new Date();
		const birth = new Date(birthDate);
		let age = today.getFullYear() - birth.getFullYear();
		const monthDiff = today.getMonth() - birth.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birth.getDate())
		) {
			age--;
		}
		return t("children.age.years", { count: age, defaultValue: `${age} ans` });
	};

	const handleDelete = () => {
		remove(
			{
				id: child._id as unknown as import("@convex/_generated/dataModel").Id<"childProfiles">,
			},
			{
				onSuccess: () => {
					toast.success(t("children.deleted"));
					setShowDeleteConfirm(false);
				},
				onError: () => toast.error(t("common.error")),
			},
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: index * 0.05 }}
		>
			<FlatCard className="group hover:shadow-md transition-shadow">
				<div className="p-4 pb-2">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
								<User className="h-5 w-5 text-pink-600 dark:text-pink-400" />
							</div>
							<div>
								<h3 className="text-lg font-semibold">
									{child.identity.firstName} {child.identity.lastName}
								</h3>
								<p className="text-sm text-muted-foreground">
									{calculateAge(child.identity.birthDate)}
								</p>
							</div>
						</div>
						<Badge variant="outline" className={statusColors[child.status]}>
							{statusLabels[child.status]}
						</Badge>
					</div>
				</div>
				<div className="px-4 pb-4 space-y-3">
					{/* Birth info */}
					{child.identity.birthDate && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Calendar className="h-4 w-4" />
							<span>
								{new Date(child.identity.birthDate).toLocaleDateString(
									"fr-FR",
									{
										day: "numeric",
										month: "long",
										year: "numeric",
									},
								)}
							</span>
						</div>
					)}
					{child.identity.birthPlace && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<MapPin className="h-4 w-4" />
							<span>{child.identity.birthPlace}</span>
						</div>
					)}

					{/* Parents */}
					{child.parents && child.parents.length > 0 && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Users className="h-4 w-4" />
							<span>
								{child.parents
									.map((p) => `${p.firstName} ${p.lastName}`)
									.join(", ")}
							</span>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 pt-2">
						<Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/my-space/children/${child._id}`)}>
							<Eye className="h-4 w-4 mr-1" />
							{t("common.view")}
						</Button>
						<Dialog
							open={showDeleteConfirm}
							onOpenChange={setShowDeleteConfirm}
						>
							<DialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="text-destructive hover:text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>{t("children.delete.title")}</DialogTitle>
								</DialogHeader>
								<p className="text-muted-foreground">
									{t(
										"children.delete.description",
										"Le profil de {{name}} sera desactive. Cette action est reversible.",
										{
											name: `${child.identity.firstName} ${child.identity.lastName}`,
										},
									)}
								</p>
								<div className="flex justify-end gap-2 mt-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowDeleteConfirm(false)}
									>
										{t("common.cancel")}
									</Button>
									<Button
										type="button"
										variant="destructive"
										onClick={handleDelete}
										disabled={isRemoving}
									>
										{isRemoving && (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										)}
										{t("common.delete")}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</FlatCard>
		</motion.div>
	);
}

function AddChildDialog({ onClose }: { onClose: () => void }) {
	const { t } = useTranslation();
	const { mutate: create, isPending } = useConvexMutationQuery(
		api.functions.childProfiles.create,
	);

	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		birthDate: "",
		birthPlace: "",
		gender: "" as Gender | "",
	});

	const handleSubmit = () => {
		create(
			{
				firstName: formData.firstName,
				lastName: formData.lastName,
				birthDate: formData.birthDate
					? new Date(formData.birthDate).getTime()
					: undefined,
				birthPlace: formData.birthPlace || undefined,
				gender: formData.gender || undefined,
				parents: [],
			},
			{
				onSuccess: () => {
					captureEvent("myspace_children_profile_added");
					toast.success(t("children.created"));
					onClose();
				},
				onError: () => toast.error(t("common.error")),
			},
		);
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{t("children.add.title")}</DialogTitle>
			</DialogHeader>
			<div className="space-y-4 mt-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>{t("children.form.firstName")} *</Label>
						<Input
							value={formData.firstName}
							onChange={(e) =>
								setFormData({ ...formData, firstName: e.target.value })
							}
							placeholder="Jean"
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("children.form.lastName")} *</Label>
						<Input
							value={formData.lastName}
							onChange={(e) =>
								setFormData({ ...formData, lastName: e.target.value })
							}
							placeholder="Dupont"
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label>{t("children.form.birthDate")}</Label>
						<Input
							type="date"
							value={formData.birthDate}
							onChange={(e) =>
								setFormData({ ...formData, birthDate: e.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("children.form.gender")}</Label>
						<Select
							value={formData.gender}
							onValueChange={(v) =>
								setFormData({ ...formData, gender: v as Gender })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("common.select")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={Gender.Male}>{t("gender.male")}</SelectItem>
								<SelectItem value={Gender.Female}>
									{t("gender.female")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="space-y-2">
					<Label>{t("children.form.birthPlace")}</Label>
					<Input
						value={formData.birthPlace}
						onChange={(e) =>
							setFormData({ ...formData, birthPlace: e.target.value })
						}
						placeholder="Libreville, Gabon"
					/>
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={onClose}>
						{t("common.cancel")}
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={isPending || !formData.firstName || !formData.lastName}
					>
						{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{t("common.create")}
					</Button>
				</div>
			</div>
		</DialogContent>
	);
}
