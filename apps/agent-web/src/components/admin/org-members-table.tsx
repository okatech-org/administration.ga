"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { MoreHorizontal, Shield, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/org/add-member-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlatCard } from "@/components/my-space/flat-card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useAuthenticatedConvexQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

interface OrgMembersTableProps {
	orgId: Id<"orgs">;
}

function getInitials(
	firstName?: string,
	lastName?: string,
	email?: string,
): string {
	if (firstName && lastName) {
		return `${firstName[0]}${lastName[0]}`.toUpperCase();
	}
	if (firstName) {
		return firstName.slice(0, 2).toUpperCase();
	}
	if (email) {
		return email.slice(0, 2).toUpperCase();
	}
	return "??";
}

interface MemberWithUser {
	_id?: Id<"users">;
	firstName?: string;
	lastName?: string;
	email?: string;
	profileImageUrl?: string;
	joinedAt: number;
	membershipId: Id<"memberships">;
	positionId?: Id<"positions">;
}

export function OrgMembersTable({ orgId }: OrgMembersTableProps) {
	const { t } = useTranslation();
	const [showAddDialog, setShowAddDialog] = useState(false);

	const {
		data: members,
		isPending,
		error,
	} = useAuthenticatedConvexQuery(api.functions.orgs.getMembers, { orgId });

	const { mutate: removeMember, isPending: isRemoving } =
		useConvexMutationQuery(api.functions.orgs.removeMember);

	const handleRemoveMember = async (userId: Id<"users">) => {
		try {
			await removeMember({ orgId, userId });
			toast.success(t("superadmin.orgMembers.memberRemoved"));
		} catch (error) {
			toast.error(t("superadmin.common.error"));
		}
	};

	if (error) {
		return (
			<FlatCard>
				<div className="p-3 lg:p-4 pt-6">
					<p className="text-destructive">{t("superadmin.common.error")}</p>
				</div>
			</FlatCard>
		);
	}

	const typedMembers = (members ?? []) as MemberWithUser[];

	return (
		<FlatCard>
			<div className="p-3 lg:p-4 pb-0 flex flex-row items-center justify-between">
				<div>
					<h3 className="text-sm font-bold">{t("superadmin.orgMembers.title")}</h3>
					<p className="text-sm text-muted-foreground">
						{t("superadmin.orgMembers.description")}
					</p>
				</div>
				<Button onClick={() => setShowAddDialog(true)}>
					<UserPlus className="mr-2 h-4 w-4" />
					{t("superadmin.orgMembers.addMember")}
				</Button>
			</div>
			<div className="p-3 lg:p-4">
				{isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				) : typedMembers.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("superadmin.users.columns.name")}</TableHead>
								<TableHead>{t("superadmin.users.columns.email")}</TableHead>
								<TableHead>{t("superadmin.table.createdAt")}</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{typedMembers.map((member) => (
								<TableRow key={member.membershipId}>
									<TableCell>
										<div className="flex items-center gap-2">
											<Avatar className="h-8 w-8">
												<AvatarImage src={member.profileImageUrl} />
												<AvatarFallback className="text-xs">
													{getInitials(
														member.firstName,
														member.lastName,
														member.email,
													)}
												</AvatarFallback>
											</Avatar>
											<span className="font-medium">
												{member.firstName && member.lastName
													? `${member.firstName} ${member.lastName}`
													: member.email || "—"}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{member.email || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{new Date(member.joinedAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{member._id && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>
														{t("superadmin.table.actions")}
													</DropdownMenuLabel>
													<DropdownMenuSeparator />

													<DropdownMenuItem
														onClick={() => handleRemoveMember(member._id!)}
														disabled={isRemoving}
														className="text-destructive"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														{t("superadmin.orgMembers.removeMember")}
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<p className="text-muted-foreground text-center py-8">
						{t("superadmin.orgMembers.noMembers")}
					</p>
				)}
			</div>

			<AddMemberDialog
				orgId={orgId}
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
			/>
		</FlatCard>
	);
}
