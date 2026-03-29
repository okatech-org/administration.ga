"use client";

import { api } from "@convex/_generated/api";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Users2, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface Recipient {
	userId: string;
	name: string;
	email: string;
	positionTitle?: string;
	orgId: string;
	orgName: string;
	avatarUrl?: string;
}

interface RecipientPickerProps {
	selected: Recipient[];
	onChange: (recipients: Recipient[]) => void;
	excludeUserId?: string;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function RecipientPicker({
	selected,
	onChange,
	excludeUserId,
}: RecipientPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const { data: recipients } = useAuthenticatedConvexQuery(
		api.functions.correspondance.listAvailableRecipients,
		{},
	);

	// Flatten grouped API response into Recipient[]
	const allRecipients = useMemo(() => {
		if (!recipients) return [];
		const flat: Recipient[] = [];
		for (const group of recipients as any[]) {
			for (const member of group.members ?? []) {
				flat.push({
					userId: member.userId,
					name: member.name,
					email: member.email,
					positionTitle: member.positionTitle,
					orgId: group.orgId,
					orgName: group.orgName,
					avatarUrl: member.avatarUrl,
				});
			}
		}
		return flat;
	}, [recipients]);

	const filteredRecipients = useMemo(() => {
		let list = allRecipients;

		if (excludeUserId) {
			list = list.filter((r) => r.userId !== excludeUserId);
		}

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(r) =>
					r.name.toLowerCase().includes(q) ||
					r.email.toLowerCase().includes(q) ||
					(r.positionTitle && r.positionTitle.toLowerCase().includes(q)),
			);
		}

		return list;
	}, [allRecipients, excludeUserId, search]);

	const groupedByOrg = useMemo(() => {
		const groups: Record<string, { orgName: string; members: Recipient[] }> =
			{};
		for (const r of filteredRecipients) {
			if (!groups[r.orgId]) {
				groups[r.orgId] = { orgName: r.orgName, members: [] };
			}
			groups[r.orgId].members.push(r);
		}
		return Object.entries(groups);
	}, [filteredRecipients]);

	const selectedIds = useMemo(
		() => new Set(selected.map((r) => r.userId)),
		[selected],
	);

	const toggleRecipient = (recipient: Recipient) => {
		if (selectedIds.has(recipient.userId)) {
			onChange(selected.filter((r) => r.userId !== recipient.userId));
		} else {
			onChange([...selected, recipient]);
		}
	};

	const removeRecipient = (userId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(selected.filter((r) => r.userId !== userId));
	};

	const promoteToTitulaire = (userId: string) => {
		const idx = selected.findIndex((r) => r.userId === userId);
		if (idx <= 0) return;
		const next = [...selected];
		const [promoted] = next.splice(idx, 1);
		next.unshift(promoted);
		onChange(next);
	};

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						role="combobox"
						aria-expanded={open}
						className={cn(
							"flex w-full items-center justify-between rounded-md border border-border/50 bg-card px-3 py-2 text-sm",
							"hover:bg-accent/50 transition-colors",
							"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
							selected.length > 0
								? "text-foreground"
								: "text-muted-foreground",
						)}
					>
						<div className="flex items-center gap-2 overflow-hidden">
							<Users2 className="h-4 w-4 shrink-0 opacity-50" />
							<span className="truncate">
								{selected.length > 0
									? `${selected.length} destinataire${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`
									: "Sélectionner les destinataires..."}
							</span>
						</div>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</button>
				</PopoverTrigger>
				<PopoverContent
					className="w-[--radix-popover-trigger-width] min-w-[360px] p-0"
					align="start"
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Rechercher par nom, email, poste..."
							value={search}
							onValueChange={setSearch}
						/>
						<CommandList>
							<CommandEmpty>Aucun destinataire trouvé</CommandEmpty>
							{groupedByOrg.map(([orgId, group]) => (
								<CommandGroup
									key={orgId}
									heading={
										<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<Building2 className="h-3 w-3" />
											{group.orgName}
										</span>
									}
								>
									{group.members.map((recipient) => {
										const isSelected = selectedIds.has(recipient.userId);
										return (
											<CommandItem
												key={recipient.userId}
												value={recipient.userId}
												onSelect={() => toggleRecipient(recipient)}
												className="flex items-center gap-3 px-2 py-1.5"
											>
												<Check
													className={cn(
														"h-4 w-4 shrink-0",
														isSelected ? "opacity-100" : "opacity-0",
													)}
												/>
												<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-400">
													{getInitials(recipient.name)}
												</div>
												<div className="flex min-w-0 flex-col">
													<span className="truncate text-sm font-medium text-foreground">
														{recipient.name}
													</span>
													<div className="flex items-center gap-1.5">
														{recipient.positionTitle && (
															<span className="truncate text-xs text-muted-foreground">
																{recipient.positionTitle}
															</span>
														)}
														{recipient.positionTitle && (
															<span className="text-xs text-muted-foreground/50">
																&middot;
															</span>
														)}
														<span className="truncate text-[11px] text-muted-foreground/70">
															{recipient.email}
														</span>
													</div>
												</div>
											</CommandItem>
										);
									})}
								</CommandGroup>
							))}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((recipient, index) => {
						const isTitulaire = index === 0;
						return (
							<button
								key={recipient.userId}
								type="button"
								onClick={() => {
									if (!isTitulaire) {
										promoteToTitulaire(recipient.userId);
									}
								}}
								className={cn(
									"inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
									isTitulaire
										? "bg-violet-500/15 text-violet-400 hover:bg-violet-500/25"
										: "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25 cursor-pointer",
								)}
							>
								<span>
									{isTitulaire ? "Titulaire" : "CC"} &mdash; {recipient.name}
								</span>
								<span
									role="button"
									tabIndex={0}
									className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
									onClick={(e) => removeRecipient(recipient.userId, e)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											removeRecipient(
												recipient.userId,
												e as unknown as React.MouseEvent,
											);
										}
									}}
								>
									<X className="h-3 w-3" />
									<span className="sr-only">Retirer {recipient.name}</span>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
