"use client";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { Badge } from "@/components/ui/badge";

type PlatformRole = "user" | "admin" | "admin_system";

const ROLE_OPTIONS: { value: PlatformRole; label: string; emoji: string; description: string }[] = [
	{
		value: "user",
		label: "Utilisateur",
		emoji: "",
		description: "Citoyen standard, accès à l'espace citoyen",
	},
	{
		value: "admin",
		label: "Admin",
		emoji: "",
		description: "Admin back-office, gestion courante",
	},
	{
		value: "admin_system",
		label: "Admin Système",
		emoji: "",
		description: "Accès complet sauf suppression du Super Admin",
	},
];

interface UserRoleDialogProps {
	user: Doc<"users">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({
	user,
	open,
	onOpenChange,
}: UserRoleDialogProps) {
	const { t } = useTranslation();
	const currentRole = (user as any).role as string || "user";
	const isSuperAdmin = currentRole === "super_admin" || (user as any).isSuperadmin;

	const [selectedRole, setSelectedRole] = useState<PlatformRole>(
		isSuperAdmin ? "user" : (currentRole as PlatformRole),
	);

	const { mutate: updateRole, isPending } = useConvexMutationQuery(
		api.functions.admin.updateUserRole,
	);

	const userName =
		user.firstName && user.lastName
			? `${user.firstName} ${user.lastName}`
			: user.email;

	const handleConfirm = async () => {
		try {
			await updateRole({ userId: user._id, role: selectedRole as any });
			toast.success(`Rôle mis à jour pour ${userName} `);
			onOpenChange(false);
		} catch (err) {
			toast.error(t("superadmin.common.error"));
		}
	};

	// Super Admin accounts cannot be modified
	if (isSuperAdmin) {
		return (
			<AlertDialog open={open} onOpenChange={onOpenChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Compte protégé</AlertDialogTitle>
						<AlertDialogDescription>
							Le rôle <Badge className="bg-amber-600 text-white mx-1"> Super Admin</Badge>
							ne peut pas être modifié. Ce compte a un accès exclusif à la plateforme.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Fermer</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Modifier le rôle
					</AlertDialogTitle>
					<AlertDialogDescription>
						Changer le rôle plateforme de <strong>{userName}</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="py-4 space-y-3">
					<Label htmlFor="role-select" className="mb-2 block">
						Rôle
					</Label>
					<Select
						value={selectedRole}
						onValueChange={(value) =>
							setSelectedRole(value as PlatformRole)
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROLE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex items-center gap-2">
										<span>{option.emoji}</span>
										<div>
											<span className="font-medium">{option.label}</span>
											<span className="text-muted-foreground text-xs ml-2">
												— {option.description}
											</span>
										</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>
						Annuler
					</AlertDialogCancel>
					<AlertDialogAction onClick={handleConfirm} disabled={isPending}>
						{isPending ? "En cours..." : "Confirmer"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
