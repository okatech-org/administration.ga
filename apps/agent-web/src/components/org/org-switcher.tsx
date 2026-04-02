"use client";

import { api } from "@convex/_generated/api";
import { Building2, ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { useOrg } from "./org-provider";

export function OrgSwitcher() {
	const { activeOrg, setActiveOrgId } = useOrg();

	const { data: memberships } = useAuthenticatedConvexQuery(
		api.functions.users.getOrgMemberships,
		{},
	);

	if (!activeOrg || !memberships) {
		return (
			<div className="animate-pulse flex items-center gap-3 p-2 rounded-xl">
				<div className="bg-primary/20 aspect-square size-9 rounded-lg" />
				<div className="flex-1 space-y-2">
					<div className="h-4 bg-primary/20 rounded w-20" />
					<div className="h-3 bg-primary/20 rounded w-12" />
				</div>
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-3 w-full p-2 rounded-xl",
						"hover:bg-muted transition-colors duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						"text-left",
					)}
				>
					<div className="bg-white flex aspect-square justify-center size-9 items-center rounded-lg shadow-sm overflow-hidden shrink-0">
						<img
							src="/icons/apple-icon.png"
							alt="Logo"
							className="w-full h-full object-contain"
						/>
					</div>
					<div className="grid flex-1 text-sm leading-tight min-w-0">
						<span className="truncate font-medium">{activeOrg.name}</span>
						<span className="truncate text-xs text-muted-foreground capitalize">
							{activeOrg.role}
						</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="min-w-56 rounded-lg"
				align="start"
				side="right"
				sideOffset={4}
			>
				<DropdownMenuLabel className="text-muted-foreground text-xs">
					Organisations
				</DropdownMenuLabel>
				{memberships.map((membership: any) => (
					<DropdownMenuItem
						key={membership._id}
						onClick={() => setActiveOrgId(membership.orgId)}
						className="gap-2 p-2"
					>
						<div className="flex size-6 items-center justify-center rounded-md border">
							<Building2 className="size-3.5 shrink-0" />
						</div>
						{membership.org?.name ?? "Représentation"}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
