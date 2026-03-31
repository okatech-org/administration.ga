/**
 * iBoîte — Messagerie Consulaire Sécurisée
 *
 * Single unified Card filling full height: Sidebar | Mail list | Detail
 * Reference: Mailbox UI with border dividers, no gaps.
 * Mobile: stacked views with back navigation.
 */

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
	MailFolder,
	MailOwnerType,
	MailType,
	OrganizationType,
	PackageStatus,
} from "@convex/lib/constants";
import { LiveKitRoom } from "@livekit/components-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import type { Locale } from "date-fns";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
	Archive,
	ArrowLeft,
	BadgeCheck,
	Building2,
	Check,
	CheckCheck,
	ChevronsUpDown,
	Handshake,
	Inbox,
	Landmark,
	Loader2,
	Mail,
	MoreVertical,
	Package,
	Paperclip,
	PenLine,
	Phone,
	PhoneCall,
	PhoneMissed,
	PhoneOff,
	Reply,
	Send,
	Star,
	Trash2,
	Truck,
	User,
	Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CustomCallUI } from "@/components/meetings/custom-call-ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { captureEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// Official org types — shown with a special badge
const OFFICIAL_ORG_TYPES = new Set([
	OrganizationType.Embassy,
	OrganizationType.HighRepresentation,
	OrganizationType.GeneralConsulate,
	OrganizationType.HighCommission,
	OrganizationType.PermanentMission,
]);

const OWNER_TYPE_ICONS: Record<string, typeof User> = {
	[MailOwnerType.Profile]: User,
	[MailOwnerType.Organization]: Landmark,
	[MailOwnerType.Association]: Handshake,
	[MailOwnerType.Company]: Building2,
};

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMeeting } from "@/hooks/use-meeting";
import {
	useAuthenticatedConvexQuery,
	useAuthenticatedPaginatedQuery,
	useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute("/_app/iboite")({
	component: IBoitePage,
});

// ── Types ────────────────────────────────────────────────────────────────────

type ViewKey =
	| "inbox"
	| "starred"
	| "sent"
	| "archive"
	| "trash"
	| "packages"
	| "calls";
type MailFolderKey = Exclude<ViewKey, "packages" | "calls">;

const MAIL_FOLDERS: { key: ViewKey; icon: typeof Inbox }[] = [
	{ key: "inbox", icon: Inbox },
	{ key: "starred", icon: Star },
	{ key: "sent", icon: Send },
	{ key: "archive", icon: Archive },
	{ key: "trash", icon: Trash2 },
];

// ── Main Page ────────────────────────────────────────────────────────────────

function IBoitePage() {
	const { t, i18n } = useTranslation();
	const dateFnsLocale = i18n.language === "fr" ? fr : enUS;

	const [activeView, setActiveView] = useState<ViewKey>("inbox");
	const [selectedMailId, setSelectedMailId] =
		useState<Id<"digitalMail"> | null>(null);
	const [composeOpen, setComposeOpen] = useState(false);
	const [replyData, setReplyData] = useState<{
		recipientOwnerId: string;
		recipientOwnerType: string;
		recipientName: string;
		subject: string;
		quotedContent: string;
		threadId?: string;
		inReplyTo?: Id<"digitalMail">;
	} | null>(null);

	// Active account (mailbox entity)
	const [activeOwnerId, setActiveOwnerId] = useState<string | undefined>(
		undefined,
	)
	const [activeOwnerType, setActiveOwnerType] = useState<string | undefined>(
		undefined,
	)

	const isPackageView = activeView === "packages";
	const isCallsView = activeView === "calls";
	const isMailView = !isPackageView && !isCallsView;

	// ── Data fetching ──────────────────────────────────────────────────────

	// Accounts with unread counts for the sidebar selector
	const { data: accounts } = useAuthenticatedConvexQuery(
		api.functions.digitalMail.getAccountsWithUnread,
		{},
	)

	const folderFilterArg = {
		...(activeView === "starred"
			? {}
			: isMailView
				? { folder: activeView as MailFolder }
				: {}),
		...(activeOwnerId
			? {
					ownerId: activeOwnerId as any,
					ownerType: activeOwnerType as any,
				}
			: {}),
	}

	const {
		results: mailItems,
		status: mailPaginationStatus,
		loadMore: loadMoreMail,
	} = useAuthenticatedPaginatedQuery(
		api.functions.digitalMail.list,
		isMailView ? folderFilterArg : "skip",
		{ initialNumItems: 30 },
	)

	const { data: unreadCount } = useAuthenticatedConvexQuery(
		api.functions.digitalMail.getUnreadCount,
		activeOwnerId
			? {
					ownerId: activeOwnerId as any,
					ownerType: activeOwnerType as any,
				}
			: {},
	)

	const { data: packages } = useAuthenticatedConvexQuery(
		api.functions.deliveryPackages.listByUser,
		{},
	)

	// ── Mutations ──────────────────────────────────────────────────────────

	const { mutateAsync: markReadMutation } = useConvexMutationQuery(
		api.functions.digitalMail.markRead,
	)
	const { mutateAsync: toggleStarMutation } = useConvexMutationQuery(
		api.functions.digitalMail.toggleStar,
	)
	const { mutateAsync: moveMailMutation } = useConvexMutationQuery(
		api.functions.digitalMail.move,
	)
	const { mutateAsync: removeMailMutation } = useConvexMutationQuery(
		api.functions.digitalMail.remove,
	)
	const { mutateAsync: sendMailMutation } = useConvexMutationQuery(
		api.functions.sendMail.send,
	)

	// ── Derived data ───────────────────────────────────────────────────────

	const filteredMail = useMemo(() => {
		if (activeView === "starred") return mailItems.filter((m) => m.isStarred);
		return mailItems;
	}, [mailItems, activeView]);

	const selectedMail = useMemo(() => {
		if (!selectedMailId) return null;
		return filteredMail.find((m) => m._id === selectedMailId) ?? null;
	}, [filteredMail, selectedMailId]);

	const packageStats = useMemo(() => {
		if (!packages) return { inTransit: 0, available: 0, total: 0 };
		return {
			inTransit: packages.filter((p) => p.status === PackageStatus.InTransit)
				.length,
			available: packages.filter((p) => p.status === PackageStatus.Available)
				.length,
			total: packages.length,
		}
	}, [packages]);

	// ── Actions ────────────────────────────────────────────────────────────

	const handleSelectMail = async (mailId: Id<"digitalMail">) => {
		setSelectedMailId(mailId);
		const mail = filteredMail.find((m) => m._id === mailId);
		if (mail && !mail.isRead) {
			try {
				await markReadMutation({ id: mailId });
			} catch {
				/* noop */
			}
		}
	}

	const handleToggleStar = async (mailId: Id<"digitalMail">) => {
		try {
			const result = await toggleStarMutation({ id: mailId });
			toast.success(result ? t("iboite.starred") : t("iboite.unstarred"));
		} catch {
			toast.error(t("iboite.error"));
		}
	}

	const handleArchive = async (mailId: Id<"digitalMail">) => {
		try {
			await moveMailMutation({ id: mailId, folder: MailFolder.Archive });
			if (selectedMailId === mailId) setSelectedMailId(null);
			toast.success(t("iboite.moved"));
		} catch {
			toast.error(t("iboite.error"));
		}
	}

	const handleTrash = async (mailId: Id<"digitalMail">) => {
		try {
			await moveMailMutation({ id: mailId, folder: MailFolder.Trash });
			if (selectedMailId === mailId) setSelectedMailId(null);
			toast.success(t("iboite.moved"));
		} catch {
			toast.error(t("iboite.error"));
		}
	}

	const handleDelete = async (mailId: Id<"digitalMail">) => {
		try {
			await removeMailMutation({ id: mailId });
			if (selectedMailId === mailId) setSelectedMailId(null);
			toast.success(t("iboite.deleted"));
		} catch {
			toast.error(t("iboite.error"));
		}
	}

	const switchView = (view: ViewKey) => {
		setActiveView(view);
		setSelectedMailId(null);
	}

	const isMailLoading =
		isMailView && mailPaginationStatus === "LoadingFirstPage";

	// ── Render ─────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-4 h-full min-h-0 p-4 lg:p-6">
			<div className="shrink-0">
				<PageHeader
					title="iBoîte"
					subtitle="Messagerie consulaire sécurisée"
					icon={<Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
					iconBgClass="bg-teal-500/10"
				/>
			</div>

			{/* ── Mobile: folder chips ──────────────────────────────────────── */}
			<div className="lg:hidden flex gap-1 overflow-x-auto border border-border/50 rounded-xl bg-card p-1 scrollbar-none shrink-0">
				{MAIL_FOLDERS.map(({ key, icon: Icon }) => (
					<button
						type="button"
						key={key}
						onClick={() => switchView(key)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
							activeView === key
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80",
						)}
					>
						<Icon className="size-3.5" />
						{t(`iboite.folders.${key}`)}
						{key === "inbox" && unreadCount != null && unreadCount > 0 && (
							<span className="bg-primary-foreground/20 rounded-full text-[10px] px-1.5">
								{unreadCount}
							</span>
						)}
					</button>
				))}
				<button
					type="button"
					onClick={() => switchView("packages")}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
						activeView === "packages"
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80",
					)}
				>
					<Package className="size-3.5" />
					{t("iboite.tabs.packages")}
					{packageStats.total > 0 && (
						<span className="bg-primary-foreground/20 rounded-full text-[10px] px-1.5">
							{packageStats.total}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => switchView("calls")}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0",
						activeView === "calls"
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:bg-muted/80",
					)}
				>
					<Phone className="size-3.5" />
					{t("iboite.tabs.calls")}
				</button>
			</div>

			{/* ── Mobile: compose + account selector ──────────────────────── */}
			<div className="lg:hidden flex items-center gap-2 shrink-0">
				<Button onClick={() => setComposeOpen(true)} size="sm" className="gap-2">
					<PenLine className="size-4" />
					{t("iboite.actions.compose")}
				</Button>
				{accounts && accounts.length > 1 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon" className="shrink-0">
								{(() => {
									const activeAcct = accounts.find(
										(a) => a.ownerId === activeOwnerId,
									)
									const Icon = activeAcct
										? (OWNER_TYPE_ICONS[activeAcct.ownerType] ?? User)
										: User
									return <Icon className="size-4" />;
								})()}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{accounts.map((acct) => {
								const Icon = OWNER_TYPE_ICONS[acct.ownerType] ?? Mail;
								const isActive =
									activeOwnerId === acct.ownerId ||
									(!activeOwnerId && acct.ownerType === MailOwnerType.Profile);
								return (
									<DropdownMenuItem
										key={acct.ownerId}
										onClick={() => {
											setActiveOwnerId(acct.ownerId)
											setActiveOwnerType(acct.ownerType);
											setSelectedMailId(null)
										}}
										className={cn(isActive && "bg-primary/10 text-primary")}
									>
										<Icon className="size-4 mr-2" />
										<span className="truncate">{acct.name}</span>
										{acct.unreadCount > 0 && (
											<Badge
												variant="default"
												className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center"
											>
												{acct.unreadCount}
											</Badge>
										)}
									</DropdownMenuItem>
								)
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* ── Mobile: stacked content ───────────────────────────────────── */}
			<div className="lg:hidden flex-1 min-h-0 pb-16">
				{isCallsView ? (
					<CallsList dateFnsLocale={dateFnsLocale} />
				) : isPackageView ? (
					<PackageList
						packages={packages ?? []}
						dateFnsLocale={dateFnsLocale}
					/>
				) : isMailLoading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : (
					<AnimatePresence mode="wait">
						{selectedMail ? (
							<motion.div
								key="detail"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.15 }}
							>
								<MailDetail
									mail={selectedMail}
									dateFnsLocale={dateFnsLocale}
									onBack={() => setSelectedMailId(null)}
									onArchive={handleArchive}
									onTrash={handleTrash}
									onDelete={handleDelete}
									onToggleStar={handleToggleStar}
									onReply={(mail) => {
										setReplyData({
											recipientOwnerId: mail.sender.entityId,
											recipientOwnerType: mail.sender.entityType,
											recipientName: mail.sender.name,
											subject: mail.subject?.startsWith("Re: ")
												? mail.subject
												: `Re: ${mail.subject || t("iboite.mail.noSubject")}`,
											quotedContent: `\n\n--- ${t("iboite.reply.originalMessage")} ---\n${mail.sender.name} (${format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", { locale: dateFnsLocale })}):\n${mail.content}`,
											threadId: mail.threadId || mail._id,
											inReplyTo: mail._id,
										})
										setComposeOpen(true)
									}}
								/>
							</motion.div>
						) : (
							<motion.div
								key="list"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								<MailListInner
									mails={filteredMail}
									selectedMailId={selectedMailId}
									onSelectMail={handleSelectMail}
									onToggleStar={handleToggleStar}
									dateFnsLocale={dateFnsLocale}
									activeFolder={activeView as MailFolderKey}
									paginationStatus={mailPaginationStatus}
									onLoadMore={() => loadMoreMail(30)}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				)}
			</div>

			{/* ── Desktop: single unified card filling remaining height ──── */}
			<Card className="hidden lg:flex lg:flex-row flex-1 min-h-0 overflow-hidden p-0">
				{/* Sidebar */}
				<aside className="max-w-56 w-full border-r flex flex-col">
					{/* Compose button */}
					<div className="p-3">
						<Button
							className="w-full gap-2"
							onClick={() => setComposeOpen(true)}
						>
							<PenLine className="size-4" />
							{t("iboite.actions.compose")}
						</Button>
					</div>

					<Separator />

					{/* Account selector */}
					{accounts && accounts.length > 0 && (
						<>
							<div className="p-2 space-y-0.5">
								<p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
									{t("iboite.accounts.title")}
								</p>
								{accounts.map((acct) => (
									<button
										type="button"
										key={acct.ownerId}
										onClick={() => {
											setActiveOwnerId(acct.ownerId)
											setActiveOwnerType(acct.ownerType);
											setSelectedMailId(null)
										}}
										className={cn(
											"flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
											activeOwnerId === acct.ownerId
												? "bg-primary/10 text-primary font-medium"
												: !activeOwnerId &&
														acct.ownerType === MailOwnerType.Profile
													? "bg-primary/10 text-primary font-medium"
													: "text-muted-foreground hover:bg-muted",
										)}
									>
										<span className="flex items-center gap-2 min-w-0">
											{(() => {
												const Icon = OWNER_TYPE_ICONS[acct.ownerType] ?? Mail;
												return <Icon className="size-4 shrink-0" />;
											})()}
											<span className="truncate">{acct.name}</span>
											{acct.orgType &&
												OFFICIAL_ORG_TYPES.has(
													acct.orgType as OrganizationType,
												) && (
													<Badge
														variant="secondary"
														className="text-[9px] h-4 px-1 shrink-0 gap-0.5"
													>
														<BadgeCheck className="size-3" />
														{t("iboite.accounts.official")}
													</Badge>
												)}
										</span>
										{acct.unreadCount > 0 && (
											<Badge
												variant="default"
												className="text-[10px] h-5 min-w-5 flex items-center justify-center"
											>
												{acct.unreadCount}
											</Badge>
										)}
									</button>
								))}
							</div>
							<Separator className="mx-2" />
						</>
					)}

					<nav className="p-2 space-y-0.5">
						{MAIL_FOLDERS.map(({ key, icon: Icon }) => (
							<button
								type="button"
								key={key}
								onClick={() => switchView(key)}
								className={cn(
									"flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
									activeView === key
										? "bg-primary/10 text-primary font-medium"
										: "text-muted-foreground hover:bg-muted",
								)}
							>
								<span className="flex items-center gap-2.5">
									<Icon className="size-4" />
									{t(`iboite.folders.${key}`)}
								</span>
								{key === "inbox" && unreadCount != null && unreadCount > 0 && (
									<Badge
										variant="default"
										className="text-[10px] h-5 min-w-5 flex items-center justify-center"
									>
										{unreadCount}
									</Badge>
								)}
							</button>
						))}
					</nav>

					<Separator className="mx-2" />

					<div className="p-2">
						<p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
							{t("iboite.tabs.packages")}
						</p>
						<button
							type="button"
							onClick={() => switchView("packages")}
							className={cn(
								"flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
								activeView === "packages"
									? "bg-primary/10 text-primary font-medium"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							<span className="flex items-center gap-2.5">
								<Package className="size-4" />
								{t("iboite.packages.title")}
							</span>
							{packageStats.total > 0 && (
								<Badge
									variant="secondary"
									className="text-[10px] h-5 min-w-5 flex items-center justify-center"
								>
									{packageStats.total}
								</Badge>
							)}
						</button>

						{packageStats.total > 0 && (
							<div className="px-3 mt-2 space-y-1">
								{packageStats.inTransit > 0 && (
									<div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
										<Truck className="size-3" />
										<span>
											{packageStats.inTransit}{" "}
											{t("iboite.packages.inTransit").toLowerCase()}
										</span>
									</div>
								)}
								{packageStats.available > 0 && (
									<div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
										<Package className="size-3" />
										<span>
											{packageStats.available}{" "}
											{t("iboite.packages.available").toLowerCase()}
										</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Calls section */}
					<div className="p-2">
						<p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
							{t("iboite.tabs.calls")}
						</p>
						<button
							type="button"
							onClick={() => switchView("calls")}
							className={cn(
								"flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors",
								activeView === "calls"
									? "bg-primary/10 text-primary font-medium"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							<span className="flex items-center gap-2.5">
								<Phone className="size-4" />
								{t("iboite.calls.title")}
							</span>
						</button>
					</div>
				</aside>

				<main className="flex-1 flex min-h-0 min-w-0">
					{/* Main content area */}
					{isCallsView ? (
						<div className="flex-1 overflow-auto p-4">
							<CallsList dateFnsLocale={dateFnsLocale} />
						</div>
					) : isPackageView ? (
						<div className="flex-1 overflow-auto p-4">
							<PackageList
								packages={packages ?? []}
								dateFnsLocale={dateFnsLocale}
							/>
						</div>
					) : isMailLoading ? (
						<div className="flex-1 flex items-center justify-center">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : (
						<>
							{/* Mail list — fixed width column with its own scroll */}
							<div
								className={cn(
									"border-r flex flex-col min-h-0",
									selectedMail ? "w-80 shrink-0" : "flex-1",
								)}
							>
								<MailListInner
									mails={filteredMail}
									selectedMailId={selectedMailId}
									onSelectMail={handleSelectMail}
									onToggleStar={handleToggleStar}
									dateFnsLocale={dateFnsLocale}
									activeFolder={activeView as MailFolderKey}
									paginationStatus={mailPaginationStatus}
									onLoadMore={() => loadMoreMail(30)}
								/>
							</div>

							{/* Detail — fills remaining space, or placeholder */}
							<div className="flex-1 min-h-0 min-w-0">
								{selectedMail ? (
									<MailDetail
										mail={selectedMail}
										dateFnsLocale={dateFnsLocale}
										onBack={() => setSelectedMailId(null)}
										onArchive={handleArchive}
										onTrash={handleTrash}
										onDelete={handleDelete}
										onToggleStar={handleToggleStar}
										onReply={(mail) => {
											setReplyData({
												recipientOwnerId: mail.sender.entityId,
												recipientOwnerType: mail.sender.entityType,
												recipientName: mail.sender.name,
												subject: mail.subject?.startsWith("Re: ")
													? mail.subject
													: `Re: ${mail.subject || t("iboite.mail.noSubject")}`,
												quotedContent: `\n\n--- ${t("iboite.reply.originalMessage")} ---\n${mail.sender.name} (${format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", { locale: dateFnsLocale })}):\n${mail.content}`,
												threadId: mail.threadId || mail._id,
												inReplyTo: mail._id,
											})
											setComposeOpen(true)
										}}
									/>
								) : (
									<div className="flex flex-col items-center justify-center h-full text-center px-6">
										<Mail className="size-12 text-muted-foreground/20 mb-3" />
										<h3 className="text-sm font-medium text-muted-foreground">
											{t("iboite.mail.selectToRead")}
										</h3>
										<p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
											{t("iboite.mail.selectToReadDesc")}
										</p>
									</div>
								)}
							</div>
						</>
					)}
				</main>
			</Card>

			{/* ── Compose Dialog ────────────────────────────────────────────── */}
			<ComposeDialog
				open={composeOpen}
				onOpenChange={(open) => {
					setComposeOpen(open);
					if (!open) setReplyData(null);
				}}
				onSend={sendMailMutation}
				accounts={accounts ?? []}
				initialData={replyData}
			/>
		</div>
	)
}

// ── ComposeDialog ────────────────────────────────────────────────────────────

type Account = {
	ownerId: string;
	ownerType: string;
	name: string;
	logoUrl?: string;
	orgType?: string;
	unreadCount: number;
};

function ComposeDialog({
	open,
	onOpenChange,
	onSend,
	accounts,
	initialData,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: (args: any) => Promise<any>;
	accounts: Account[];
	initialData?: {
		recipientOwnerId: string;
		recipientOwnerType: string;
		recipientName: string;
		subject: string;
		quotedContent: string;
		threadId?: string;
		inReplyTo?: Id<"digitalMail">;
	} | null;
}) {
	const { t } = useTranslation();
	const [subject, setSubject] = useState("");
	const [content, setContent] = useState("");
	const [senderAccountIdx, setSenderAccountIdx] = useState(0);
	const [sending, setSending] = useState(false);

	// Recipient search state
	const [recipientSearch, setRecipientSearch] = useState("");
	const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
	const [typeFilter, setTypeFilter] = useState<MailOwnerType | null>(null);
	const [selectedRecipient, setSelectedRecipient] = useState<{
		ownerId: string;
		ownerType: string;
		name: string;
	} | null>(null);
	const subjectId = useId();
	const contentId = useId();

	// Debounced search query
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleRecipientSearchChange = (value: string) => {
		setRecipientSearch(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
	}

	// Pre-fill fields when opening as a reply
	React.useEffect(() => {
		if (open && initialData) {
			setSelectedRecipient({
				ownerId: initialData.recipientOwnerId,
				ownerType: initialData.recipientOwnerType,
				name: initialData.recipientName,
			})
			setSubject(initialData.subject);
			setContent(initialData.quotedContent);
		} else if (!open) {
			setSubject("");
			setContent("");
			setSelectedRecipient(null);
			setRecipientSearch("");
			setDebouncedSearch("");
			setTypeFilter(null);
		}
	}, [open, initialData]);

	const searchArgs =
		debouncedSearch.trim().length >= 2
			? { query: debouncedSearch.trim(), ...(typeFilter ? { typeFilter } : {}) }
			: ("skip" as const);
	const { data: searchResults } = useAuthenticatedConvexQuery(
		api.functions.digitalMail.searchRecipients,
		searchArgs,
	)

	const senderAccount = accounts[senderAccountIdx];

	const handleSend = async () => {
		if (!selectedRecipient || !content.trim()) {
			toast.error(
				t(
					"iboite.compose.fillRequired",
					"Veuillez remplir les champs obligatoires",
				),
			)
			return
		}
		setSending(true);
		try {
			await onSend({
				senderOwnerId: senderAccount?.ownerId,
				senderOwnerType: senderAccount?.ownerType,
				recipientOwnerId: selectedRecipient.ownerId,
				recipientOwnerType: selectedRecipient.ownerType,
				type: MailType.Email,
				subject: subject.trim() || t("iboite.mail.noSubject"),
				...(initialData?.threadId ? { threadId: initialData.threadId } : {}),
				...(initialData?.inReplyTo ? { inReplyTo: initialData.inReplyTo } : {}),
			})

			captureEvent("myspace_iboite_message_sent", {
				recipient_org:
					selectedRecipient.ownerType === MailOwnerType.Organization
						? selectedRecipient.name
						: undefined,
			})

			toast.success(t("iboite.compose.sent"));
			setSubject("");
			setContent("");
			setSelectedRecipient(null);
			setRecipientSearch("");
			setDebouncedSearch("");
			setTypeFilter(null);
			onOpenChange(false);
		} catch {
			toast.error(t("iboite.error"));
		} finally {
			setSending(false);
		}
	}

	// Translate raw enum subtitles from backend
	const subtitleLabels: Record<string, string> = {
		// OrganizationType
		embassy: t("orgs.type.embassy"),
		high_representation: t("orgs.type.highRepresentation"),
		general_consulate: t("orgs.type.generalConsulate"),
		high_commission: t("orgs.type.highCommission"),
		permanent_mission: t("orgs.type.permanentMission"),
		third_party: t("orgs.type.thirdParty"),
		// AssociationType
		cultural: t("associations.type.cultural"),
		sports: t("associations.type.sports"),
		religious: t("associations.type.religious"),
		professional: t("associations.type.professional"),
		solidarity: t("associations.type.solidarity"),
		education: t("associations.type.education"),
		youth: t("associations.type.youth"),
		women: t("associations.type.women"),
		student: t("associations.type.student"),
		// ActivitySector
		technology: t("companies.sector.technology"),
		commerce: t("companies.sector.commerce"),
		services: t("companies.sector.services"),
		industry: t("companies.sector.industry"),
		agriculture: t("companies.sector.agriculture"),
		health: t("companies.sector.health"),
		culture: t("companies.sector.culture"),
		tourism: t("companies.sector.tourism"),
		transport: t("companies.sector.transport"),
		construction: t("companies.sector.construction"),
		// Common
		other: t("common.other"),
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-dvh sm:max-h-[85vh] sm:max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<PenLine className="size-5" />
						{t("iboite.actions.compose")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					{/* Sender selector */}
					{accounts.length > 1 && (
						<div className="space-y-2">
							<Label>{t("iboite.compose.from")}</Label>
							<select
								aria-label={t("iboite.compose.from")}
								className="w-full rounded-md border bg-background px-3 py-2 text-sm"
								value={senderAccountIdx}
								onChange={(e) => setSenderAccountIdx(Number(e.target.value))}
							>
								{accounts.map((acct, i) => (
									<option key={acct.ownerId} value={i}>
										{acct.name}
									</option>
								))}
							</select>
						</div>
					)}
					{/* Recipient picker with search */}
					<div className="space-y-2">
						<Label>{t("iboite.compose.to")}</Label>
						{/* Type filter chips */}
						<div className="flex flex-wrap gap-1.5">
							{[
								{ value: null, label: t("iboite.compose.filterAll") },
								{
									value: MailOwnerType.Profile,
									label: t("iboite.compose.filterProfiles"),
									icon: User,
								},
								{
									value: MailOwnerType.Organization,
									label: t("iboite.compose.filterOrgs"),
									icon: Landmark,
								},
								{
									value: MailOwnerType.Association,
									label: t("iboite.compose.filterAssocs"),
									icon: Handshake,
								},
								{
									value: MailOwnerType.Company,
									label: t("iboite.compose.filterCompanies"),
									icon: Building2,
								},
							].map((chip) => {
								const isActive = typeFilter === chip.value;
								const ChipIcon = chip.icon;
								return (
									<Button
										key={chip.value ?? "all"}
										type="button"
										size="sm"
										variant={isActive ? "default" : "outline"}
										className="h-7 rounded-full px-3 text-xs gap-1"
										onClick={() => setTypeFilter(chip.value)}
									>
										{ChipIcon && <ChipIcon className="size-3" />}
										{chip.label}
									</Button>
								)
							})}
						</div>
						<Popover
							open={recipientPopoverOpen}
							onOpenChange={setRecipientPopoverOpen}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={recipientPopoverOpen}
									className="w-full justify-between font-normal"
								>
									{selectedRecipient ? (
										<span className="flex items-center gap-2 truncate">
											{(() => {
												const Icon =
													OWNER_TYPE_ICONS[selectedRecipient.ownerType] ?? Mail;
												return <Icon className="size-4" />
											})()}
											{selectedRecipient.name}
										</span>
									) : (
										<span className="text-muted-foreground">
											{t(
												"iboite.compose.recipientPlaceholder",
												"Rechercher un destinataire...",
											)}
										</span>
									)}
									<ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-[--radix-popover-trigger-width] p-0"
								align="start"
							>
								<Command shouldFilter={false}>
									<CommandInput
										placeholder={t(
											"iboite.compose.searchRecipient",
											"Rechercher par nom...",
										)}
										value={recipientSearch}
										onValueChange={handleRecipientSearchChange}
									/>
									<CommandList>
										{debouncedSearch.trim().length < 2 ? (
											<CommandEmpty>
												{t(
													"iboite.compose.typeToSearch",
													"Tapez au moins 2 caractères...",
												)}
											</CommandEmpty>
										) : !searchResults ? (
											<div className="flex items-center justify-center py-4">
												<Loader2 className="size-4 animate-spin text-muted-foreground" />
											</div>
										) : searchResults.length === 0 ? (
											<CommandEmpty>
												{t("iboite.compose.noResults")}
											</CommandEmpty>
										) : (
											<CommandGroup>
												{searchResults.map((result: any) => {
													const Icon =
														OWNER_TYPE_ICONS[result.ownerType] ?? Mail;
													return (
														<CommandItem
															key={result.ownerId}
															value={result.ownerId}
															onSelect={() => {
																setSelectedRecipient({
																	ownerId: result.ownerId,
																	ownerType: result.ownerType,
																	name: result.name,
																})
																setRecipientPopoverOpen(false)
															}}
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4",
																	selectedRecipient?.ownerId === result.ownerId
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
															<Icon className="mr-2 size-4 text-muted-foreground" />
															<div className="flex flex-col min-w-0">
																<span className="text-sm truncate">
																	{result.name}
																</span>
																{result.subtitle && (
																	<span className="text-xs text-muted-foreground truncate">
																		{subtitleLabels[result.subtitle] ??
																			result.subtitle}
																	</span>
																)}
															</div>
														</CommandItem>
													)
												})}
											</CommandGroup>
										)}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					<div className="space-y-2">
						<Label htmlFor="subject">{t("iboite.compose.subject")}</Label>
						<Input
							id={subjectId}
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder={t(
								"iboite.compose.subjectPlaceholder",
								"Objet du message",
							)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="content">{t("iboite.compose.message")}</Label>
						<Textarea
							id={contentId}
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder={t(
								"iboite.compose.messagePlaceholder",
								"Écrivez votre message...",
							)}
							rows={8}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={sending}
						>
							{t("common.cancel")}
						</Button>
						<Button onClick={handleSend} disabled={sending} className="gap-2">
							{sending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Send className="size-4" />
							)}
							{t("iboite.compose.send")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

// ── MailListInner (no Card wrapper — lives inside the unified card) ──────────

function MailListInner({
	mails,
	selectedMailId,
	onSelectMail,
	onToggleStar,
	dateFnsLocale,
	activeFolder,
	paginationStatus,
	onLoadMore,
}: {
	mails: Doc<"digitalMail">[];
	selectedMailId: Id<"digitalMail"> | null;
	onSelectMail: (id: Id<"digitalMail">) => void;
	onToggleStar: (id: Id<"digitalMail">) => void;
	dateFnsLocale: Locale;
	activeFolder: MailFolderKey;
	paginationStatus: string;
	onLoadMore: () => void;
}) {
	const { t } = useTranslation();

	if (mails.length === 0) {
		return (
			<div className="min-h-full flex flex-col items-center justify-center text-center px-6">
				<Inbox className="size-12 text-muted-foreground/20 mb-3" />
				<h3 className="text-sm font-medium text-muted-foreground">
					{t(`iboite.empty.${activeFolder}`)}
				</h3>
				<p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
					{t(`iboite.empty.${activeFolder}Desc`)}
				</p>
			</div>
		)
	}

	return (
		<ScrollArea className="flex-1 min-h-full">
			<div className="divide-y">
				{mails.map((mail) => (
					<button
						type="button"
						key={mail._id}
						onClick={() => onSelectMail(mail._id)}
						className={cn(
							"w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 flex items-start gap-3",
							selectedMailId === mail._id && "bg-primary/5",
							!mail.isRead && "bg-primary/2",
						)}
					>
						<div className="pt-2 shrink-0 w-2">
							{!mail.isRead && (
								<div className="size-2 rounded-full bg-primary" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between gap-2">
								<p
									className={cn(
										"text-sm truncate",
										!mail.isRead && "font-semibold",
									)}
								>
									{mail.sender?.name ?? "—"}
								</p>
								<span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
									{formatDistanceToNow(new Date(mail.createdAt), {
										addSuffix: false,
										locale: dateFnsLocale,
									})}
								</span>
							</div>
							<p
								className={cn(
									"text-sm truncate mt-0.5",
									!mail.isRead
										? "text-foreground font-medium"
										: "text-muted-foreground",
								)}
							>
								{mail.subject || t("iboite.mail.noSubject")}
							</p>
							{mail.preview && (
								<p className="text-xs text-muted-foreground/70 truncate mt-0.5">
									{mail.preview}
								</p>
							)}
							{mail.attachments && mail.attachments.length > 0 && (
								<div className="flex items-center gap-1 mt-1">
									<Paperclip className="size-3 text-muted-foreground/50" />
									<span className="text-[11px] text-muted-foreground/50">
										{mail.attachments.length}
									</span>
								</div>
							)}
						</div>
						<button
							type="button"
							aria-label={mail.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
							onClick={(e) => {
								e.stopPropagation()
								onToggleStar(mail._id)
							}}
							className="shrink-0 pt-1"
						>
							<Star
								className={cn(
									"size-4 transition-colors",
									mail.isStarred
										? "fill-amber-400 text-amber-400"
										: "text-transparent hover:text-muted-foreground/30",
								)}
							/>
						</button>
					</button>
				))}
			</div>

			{paginationStatus === "CanLoadMore" && (
				<div className="p-3 text-center border-t">
					<Button
						variant="ghost"
						size="sm"
						onClick={onLoadMore}
						className="text-xs"
					>
						{t("iboite.actions.loadMore")}
					</Button>
				</div>
			)}
			{paginationStatus === "LoadingMore" && (
				<div className="p-3 flex justify-center border-t">
					<Loader2 className="size-4 animate-spin text-muted-foreground" />
				</div>
			)}
		</ScrollArea>
	)
}

// ── MailDetail ───────────────────────────────────────────────────────────────

function MailDetail({
	mail,
	dateFnsLocale,
	onBack,
	onArchive,
	onTrash,
	onDelete,
	onToggleStar,
	onReply,
}: {
	mail: Doc<"digitalMail">;
	dateFnsLocale: Locale;
	onBack: () => void;
	onArchive: (id: Id<"digitalMail">) => void;
	onTrash: (id: Id<"digitalMail">) => void;
	onDelete: (id: Id<"digitalMail">) => void;
	onToggleStar: (id: Id<"digitalMail">) => void;
	onReply: (mail: Doc<"digitalMail">) => void;
}) {
	const { t } = useTranslation();

	// Thread query — fetch all messages in the same thread
	const threadArgs = mail.threadId
		? { threadId: mail.threadId }
		: ("skip" as const);
	const { data: threadMessages } = useAuthenticatedConvexQuery(
		api.functions.digitalMail.getThread,
		threadArgs,
	)

	// If we have thread data with 2+ messages, show conversation view
	const hasThread = threadMessages && threadMessages.length > 1;

	return (
        <div className="flex flex-col flex-1 min-h-full">
            {/* Toolbar */}
            <div className="px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0">
				<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
					<ArrowLeft className="size-4" />
					<span className="lg:hidden">{t("iboite.actions.back")}</span>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={() => onReply(mail)}
					className="gap-1.5"
					title={t("iboite.actions.reply")}
				>
					<Reply className="size-4" />
					<span className="hidden sm:inline">{t("iboite.actions.reply")}</span>
				</Button>

				<div className="flex items-center gap-0.5">
					{/* Desktop: individual action buttons */}
					<Button
						variant="ghost"
						size="icon"
						className="size-8 hidden sm:inline-flex"
						onClick={() => onArchive(mail._id)}
						title={t("iboite.actions.archive")}
					>
						<Archive className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 hidden sm:inline-flex"
						onClick={() => onTrash(mail._id)}
						title={t("iboite.actions.delete")}
					>
						<Trash2 className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 hidden sm:inline-flex"
						onClick={() => onToggleStar(mail._id)}
						title={
							mail.isStarred
								? t("iboite.actions.unstar")
								: t("iboite.actions.star")
						}
					>
						<Star
							className={cn(
								"size-4",
								mail.isStarred && "fill-amber-400 text-amber-400",
							)}
						/>
					</Button>
					{/* Dropdown: always visible, contains overflow actions on mobile */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<MoreVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{/* Mobile-only: archive, trash, star */}
							<DropdownMenuItem
								className="sm:hidden"
								onClick={() => onArchive(mail._id)}
							>
								<Archive className="size-4 mr-2" />
								{t("iboite.actions.archive")}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="sm:hidden"
								onClick={() => onTrash(mail._id)}
							>
								<Trash2 className="size-4 mr-2" />
								{t("iboite.actions.delete")}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="sm:hidden"
								onClick={() => onToggleStar(mail._id)}
							>
								<Star
									className={cn(
										"size-4 mr-2",
										mail.isStarred && "fill-amber-400 text-amber-400",
									)}
								/>
								{mail.isStarred
									? t("iboite.actions.unstar")
									: t("iboite.actions.star")}
							</DropdownMenuItem>
							{/* Permanent delete for trash folder */}
							{mail.folder === MailFolder.Trash && (
								<DropdownMenuItem
									onClick={() => onDelete(mail._id)}
									className="text-destructive"
								>
									<Trash2 className="size-4 mr-2" />
									{t("common.delete")}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
            {/* Body */}
            <ScrollArea className="flex-1">
				<div className="p-5 space-y-4">
					<h2 className="text-lg font-semibold leading-tight">
						{mail.subject || t("iboite.mail.noSubject")}
					</h2>

					{mail.recipient && (
						<p className="text-xs text-muted-foreground">
							{t("iboite.mail.to")}: {mail.recipient.name}
						</p>
					)}

					{/* Thread conversation view */}
					{hasThread ? (
						<div className="space-y-3">
							{threadMessages.map((msg) => {
								const isCurrent = msg._id === mail._id;
								return (
									<div
										key={msg._id}
										className={cn(
											"rounded-lg border p-4 transition-colors",
											isCurrent
												? "bg-primary/5 border-primary/20"
												: "bg-muted/30 border-muted",
										)}
									>
										{/* Message header */}
										<div className="flex items-center justify-between gap-3 mb-2">
											<div className="flex items-center gap-2 min-w-0">
												<div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
													{(msg.sender?.name ?? "?").charAt(0).toUpperCase()}
												</div>
												<p className="text-sm font-medium truncate">
													{msg.sender?.name}
												</p>
											</div>
											<p className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
												{format(new Date(msg.createdAt), "d MMM yyyy, HH:mm", {
													locale: dateFnsLocale,
												})}
											</p>
										</div>
										{/* Message content */}
										<div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 pl-9">
											{msg.content}
										</div>
									</div>
								)
							})}
						</div>
					) : (
						/* Single message view (no thread) */
						(<>
                            {/* Sender row */}
                            <div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-3 min-w-0">
									<div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
										{(mail.sender?.name ?? "?").charAt(0).toUpperCase()}
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">
											{mail.sender?.name}
										</p>
										{mail.sender?.entityType && (
											<p className="text-xs text-muted-foreground truncate flex items-center gap-1">
												{(() => {
													const Icon =
														OWNER_TYPE_ICONS[mail.sender.entityType] ?? Mail;
													return <Icon className="size-3" />
												})()}
												{t(
													`iboite.ownerType.${mail.sender.entityType}`,
													mail.sender.entityType,
												)}
											</p>
										)}
									</div>
								</div>
								<p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
									{format(new Date(mail.createdAt), "d MMM yyyy, HH:mm", {
										locale: dateFnsLocale,
									})}
								</p>
							</div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
								{mail.content}
							</div>
                        </>)
					)}

					{mail.attachments && mail.attachments.length > 0 && (
						<div className="pt-3 border-t">
							<p className="text-sm font-medium mb-2 flex items-center gap-1.5">
								{t("iboite.mail.attachments")}{" "}
								<span className="text-muted-foreground">
									({mail.attachments.length})
								</span>
							</p>
							<div className="flex flex-wrap gap-2">
								{mail.attachments.map(
									(att: { name: string; size: string; storageId?: string }) => (
										<div
											key={att.name}
											className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border text-sm hover:bg-muted transition-colors"
										>
											<Paperclip className="size-3.5 text-muted-foreground shrink-0" />
											<span className="truncate max-w-[180px]">{att.name}</span>
											<span className="text-[10px] text-muted-foreground">
												{att.size}
											</span>
										</div>
									),
								)}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>
        </div>
    )
}

// ── PackageList ───────────────────────────────────────────────────────────────

function PackageList({
	packages,
	dateFnsLocale,
}: {
	packages: Doc<"deliveryPackages">[];
	dateFnsLocale: Locale;
}) {
	const { t } = useTranslation();

	if (packages.length === 0) {
		return (
			<div className="flex min-h-full flex-col items-center justify-center py-16 text-center">
				<Package className="size-12 text-muted-foreground/20 mb-3" />
				<h3 className="text-sm font-medium text-muted-foreground">
					{t("iboite.empty.packages")}
				</h3>
				<p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
					{t("iboite.empty.packagesDesc")}
				</p>
			</div>
		)
	}

	const statusConfig: Record<
		string,
		{ label: string; color: string; icon: typeof Package }
	> = {
		[PackageStatus.InTransit]: {
			label: t("iboite.packages.inTransit"),
			color:
				"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
			icon: Truck,
		},
		[PackageStatus.Available]: {
			label: t("iboite.packages.available"),
			color:
				"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
			icon: Package,
		},
		[PackageStatus.Delivered]: {
			label: t("iboite.packages.delivered"),
			color:
				"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
			icon: CheckCheck,
		},
		[PackageStatus.Pending]: {
			label: t("iboite.packages.pending"),
			color: "bg-muted text-muted-foreground border-muted",
			icon: Package,
		},
		[PackageStatus.Returned]: {
			label: t("iboite.packages.returned"),
			color:
				"bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
			icon: Package,
		},
	}

	return (
		<div className="space-y-3 min-h-full">
			{packages.map((pkg) => {
				const status =
					statusConfig[pkg.status] ?? statusConfig[PackageStatus.Pending];
				const StatusIcon = status.icon;
				return (
					<div
						key={pkg._id}
						className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
					>
						<div
							className={cn("p-2.5 rounded-lg border shrink-0", status.color)}
						>
							<StatusIcon className="size-5" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="font-medium text-sm">{pkg.description}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{t("iboite.packages.sender")}: {pkg.sender}
									</p>
								</div>
								<Badge
									variant="outline"
									className={cn("shrink-0 text-xs", status.color)}
								>
									{status.label}
								</Badge>
							</div>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
								<span>
									{t("iboite.packages.tracking")}:{" "}
									<span className="font-mono">{pkg.trackingNumber}</span>
								</span>
								{pkg.estimatedDelivery && (
									<span>
										{t("iboite.packages.estimatedDelivery")}:{" "}
										{format(new Date(pkg.estimatedDelivery), "d MMM yyyy", {
											locale: dateFnsLocale,
										})}
									</span>
								)}
							</div>
							{pkg.events && pkg.events.length > 0 && (
								<div className="mt-3 space-y-1.5 border-l-2 border-muted pl-3 ml-1">
									{pkg.events
										.slice(-3)
										.reverse()
										.map(
											(
												event: {
													timestamp: number
													description: string
													location?: string
												},
												idx: number,
											) => (
												<div
													key={"evt-${event.timestamp}-${idx}"}
													className="text-xs"
												>
													<p className="text-muted-foreground">
														{format(new Date(event.timestamp), "d MMM, HH:mm", {
															locale: dateFnsLocale,
														})}
													</p>
													<p className="text-foreground">{event.description}</p>
													{event.location && (
														<p className="text-muted-foreground">
															{event.location}
														</p>
													)}
												</div>
											),
										)}
								</div>
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}

// ── CallsList ────────────────────────────────────────────────────────────────

function CallsList({ dateFnsLocale }: { dateFnsLocale: Locale }) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();
	const { data: callsData } = useAuthenticatedConvexQuery(
		api.functions.meetings.listMine,
		{},
	)
	const calls = callsData?.meetings;
	const participantNames = callsData?.participantNames ?? {};

	// Compute display name: show the OTHER participant's name, not our own
	const getCallDisplayName = (call: Doc<"meetings">) => {
		const otherParticipant = call.participants.find(
			(p) => p.userId !== currentUser?._id,
		)
		if (otherParticipant) {
			const name = participantNames[otherParticipant.userId];
			if (name) return `Appel — ${name}`;
		}
		// Fallback: if we created the call, the title already shows the target
		if (call.createdBy === currentUser?._id) return call.title;
		// Otherwise show the caller's name
		const callerName = participantNames[call.createdBy];
		return callerName ? `Appel — ${callerName}` : call.title;
	}

	const [activeCallId, setActiveCallId] = useState<Id<"meetings"> | null>(null);

	const {
		meeting: activeMeeting,
		token,
		wsUrl,
		isConnecting,
		error,
		connect,
		disconnect,
	} = useMeeting(activeCallId ?? undefined);

	const handleJoin = useCallback(
		async (meetingId: Id<"meetings">) => {
			try {
				setActiveCallId(meetingId);
				await connect(meetingId);
			} catch (err) {
				console.error("Failed to join call:", err);
				setActiveCallId(null);
			}
		},
		[connect],
	)

	const handleHangUp = useCallback(async () => {
		if (activeCallId) {
			await disconnect(activeCallId);
		}
		setActiveCallId(null);
	}, [activeCallId, disconnect]);

	useEffect(() => {
		if (activeMeeting?.status === "ended" && activeCallId) {
			setActiveCallId(null);
		}
	}, [activeMeeting?.status, activeCallId]);

	const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
	const [callEmail, setCallEmail] = useState("");
	const [isCalling, setIsCalling] = useState(false);
	const callCitizen = useMutation(api.functions.meetings.callCitizenByEmail);
	const callCitizenById = useMutation(api.functions.meetings.callCitizenById);
	const callOrgMutation = useMutation(api.functions.meetings.callOrganization);
	const { data: currentUser } = useAuthenticatedConvexQuery(
		api.functions.users.getMe,
		{},
	)

	const handleRecall = async (call: Doc<"meetings">) => {
		try {
			setIsCalling(true);

			// For org calls: call the org back
			if (call.orgId && call.isOrgInbound) {
				const { meetingId } = await callOrgMutation({ orgId: call.orgId });
				toast.success(t("iboite.call.startSuccess", "Appel lancé"));
				handleJoin(meetingId);
				return
			}

			// For C2C or org-outbound: find the OTHER participant
			const otherParticipant = call.participants.find(
				(p) => p.userId !== currentUser?._id,
			)
			const targetUserId = otherParticipant?.userId;

			if (!targetUserId) {
				toast.error("Impossible d'identifier le correspondant");
				return
			}

			const { meetingId } = await callCitizenById({ targetUserId });
			toast.success(t("iboite.call.startSuccess", "Appel lancé"));
			handleJoin(meetingId);
		} catch (err: unknown) {
			console.error("Failed to recall:", err);
			const errorMessage =
				err instanceof Error
					? (err.message.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ??
						t("iboite.call.error", "Erreur lors de l'appel"))
					: t("iboite.call.error", "Erreur lors de l'appel");
			toast.error(errorMessage);
		} finally {
			setIsCalling(false);
		}
	}

	const handleInitiateCall = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!callEmail.trim()) return;
		setIsCalling(true);
		try {
			const { meetingId } = await callCitizen({ email: callEmail.trim() });
			toast.success(t("iboite.call.startSuccess", "Appel lancé"));
			setIsCallDialogOpen(false);
			setCallEmail("");
			handleJoin(meetingId);
		} catch (error: any) {
			console.error("Failed to call:", error);
			const errorMessage =
				typeof error?.data === "string"
					? error.data
					: error?.data?.errorMessage ||
						error?.message?.match(/Uncaught ConvexError: (.*?)(?:\n|$)/)?.[1] ||
						t("iboite.call.error", "Erreur lors de l'appel");
			toast.error(errorMessage);
		} finally {
			setIsCalling(false);
		}
	}

	if (!calls) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		)
	}

	if (calls.length === 0) {
		return (
			<div className="p-4 h-full flex flex-col">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-lg font-semibold">{t("iboite.calls.title")}</h2>
						<p className="text-sm text-muted-foreground mt-1">
							{t(
								"iboite.calls.subtitle",
								"Historique de vos appels audio et vidéo",
							)}
						</p>
					</div>
					<Button
						onClick={() => setIsCallDialogOpen(true)}
						className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
					>
						<PhoneCall className="size-4" />
						{t("iboite.call.newCall", "Nouvel appel")}
					</Button>

					<Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
						<DialogContent className="sm:max-w-[425px]">
							<DialogHeader>
								<DialogTitle>
									{t("iboite.call.newCallTitle", "Appeler un contact")}
								</DialogTitle>
							</DialogHeader>
							<form onSubmit={handleInitiateCall} className="space-y-4 pt-4">
								<div className="space-y-2">
									<Input
										type="email"
										placeholder={t(
											"iboite.call.emailPlaceholder",
											"Adresse email du contact",
										)}
										value={callEmail}
										onChange={(e) => setCallEmail(e.target.value)}
										autoComplete="off"
									/>
									<p className="text-xs text-muted-foreground">
										{t(
											"iboite.call.emailHelp",
											"Saisissez l'adresse email exacte de la personne que vous souhaitez appeler. Elle recevra une notification pour rejoindre l'appel.",
										)}
									</p>
								</div>
								<div className="flex justify-end gap-3 pt-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCallDialogOpen(false)}
									>
										{t("iboite.actions.cancel", "Annuler")}
									</Button>
									<Button
										type="submit"
										disabled={isCalling || !callEmail.trim()}
										className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
									>
										{isCalling ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<PhoneCall className="size-4" />
										)}
										{t("iboite.call.startCall", "Appeler")}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				</div>
				<div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
					<Phone className="size-12 text-muted-foreground/20 mb-3" />
					<h3 className="text-sm font-medium text-muted-foreground">
						{t("iboite.calls.empty")}
					</h3>
					<p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
						{t("iboite.calls.emptyDesc")}
					</p>
				</div>
			</div>
		)
	}

	const statusConfig: Record<
		string,
		{ label: string; color: string; icon: typeof Phone }
	> = {
		active: {
			label: t("iboite.calls.status.active"),
			color:
				"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
			icon: PhoneCall,
		},
		ended: {
			label: t("iboite.calls.status.ended"),
			color: "bg-muted text-muted-foreground border-muted",
			icon: PhoneOff,
		},
		scheduled: {
			label: t("iboite.calls.status.scheduled"),
			color:
				"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
			icon: Phone,
		},
		cancelled: {
			label: t("iboite.calls.status.cancelled"),
			color:
				"bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
			icon: PhoneMissed,
		},
	}

	const callContent = (
		<div className="flex flex-col flex-1 min-h-0 h-full bg-zinc-950 overflow-hidden">
			{token && wsUrl ? (
				<LiveKitRoom
					token={token}
					serverUrl={wsUrl}
					connect={true}
					audio={true}
					onDisconnected={handleHangUp}
					className="flex-1 min-h-0 flex flex-col"
					style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
				>
					<CustomCallUI
						onHangUp={handleHangUp}
						title={
							activeCallId
								? getCallDisplayName(
										calls.find((c) => c._id === activeCallId) ?? calls[0],
									)
								: undefined
						}
					/>
				</LiveKitRoom>
			) : (
				<div className="h-full flex items-center justify-center">
					<div className="text-center space-y-3">
						<Loader2 className="w-8 h-8 animate-spin text-zinc-500 mx-auto" />
						<p className="text-zinc-400 text-sm">
							{t("meetings.connecting", "Connexion au serveur d'appel...")}
						</p>
					</div>
				</div>
			)}
		</div>
	)

	return (
		<>
			<div className="p-4 h-full">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-lg font-semibold">{t("iboite.calls.title")}</h2>
						<div className="text-sm text-muted-foreground mt-1">
							{t(
								"iboite.calls.subtitle",
								"Historique de vos appels audio et vidéo",
							)}
						</div>
					</div>
					<Button
						onClick={() => setIsCallDialogOpen(true)}
						className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
					>
						<PhoneCall className="size-4" />
						{t("iboite.call.newCall", "Nouvel appel")}
					</Button>
				</div>

				<div className="space-y-3 min-h-full">
					{calls.map((call) => {
						const status = statusConfig[call.status] ?? statusConfig.ended;
						const StatusIcon = status.icon;
						const isActive = call.status === "active";
						const isOutgoing = call.createdBy === currentUser?._id;
						const isMissed =
							!isOutgoing &&
							call.status === "ended" &&
							call.participants.filter((p) => p.joinedAt).length <= 1;

						// Calculate duration
						let duration = ""
						if (call.startedAt && call.endedAt) {
							const durationMs = call.endedAt - call.startedAt;
							const minutes = Math.floor(durationMs / 60000);
							const seconds = Math.floor((durationMs % 60000) / 1000);
							duration =
								minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
						}

						return (
							<div
								key={call._id}
								className={cn(
									"flex items-start gap-3 p-3 border rounded-lg transition-colors",
									isActive
										? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5"
										: "hover:bg-muted/30",
								)}
							>
								<div
									className={cn("p-2 rounded-lg border shrink-0", status.color)}
								>
									<StatusIcon className="size-4" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<p className="font-medium text-sm truncate">
											{getCallDisplayName(call)}
										</p>
										<Badge
											variant="outline"
											className={cn("text-xs shrink-0", status.color)}
										>
											{status.label}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										<span
											className={
												isMissed
													? "text-red-500 font-medium"
													: isOutgoing
														? "text-emerald-600 dark:text-emerald-400"
														: "text-blue-600 dark:text-blue-400"
											}
										>
											{isMissed
												? t("iboite.calls.missed", "Manqué")
												: isOutgoing
													? t("iboite.calls.outgoing", "Sortant")
													: t("iboite.calls.incoming", "Entrant")}
										</span>
										{" · "}
										{call.participants.length} {t("iboite.calls.participants")}
									</p>
									<div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
										{call.startedAt && (
											<span>
												{format(new Date(call.startedAt), "d MMM, HH:mm", {
													locale: dateFnsLocale,
												})}
											</span>
										)}
										{call.scheduledAt && !call.startedAt && (
											<span>
												{t("iboite.calls.scheduledFor")}{" "}
												{format(new Date(call.scheduledAt), "d MMM, HH:mm", {
													locale: dateFnsLocale,
												})}
											</span>
										)}
										{duration && (
											<span>
												{t("iboite.calls.duration")}: {duration}
											</span>
										)}
									</div>
									{/* Action buttons */}
									<div className="flex items-center gap-2 mt-2">
										{isActive && (
											<Button
												size="sm"
												variant="default"
												className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
												onClick={() => handleJoin(call._id)}
												disabled={isConnecting || activeCallId === call._id}
											>
												{isConnecting && activeCallId === call._id ? (
													<Loader2 className="size-3.5 animate-spin" />
												) : (
													<PhoneCall className="size-3.5" />
												)}
												{t("iboite.calls.join")}
											</Button>
										)}
										{(call.status === "ended" ||
											call.status === "cancelled") && (
											<Button
												size="sm"
												variant="secondary"
												className="gap-1.5 h-8 text-xs"
												onClick={() => handleRecall(call)}
												disabled={isCalling}
											>
												<PhoneCall className="size-3.5" />
												{t("iboite.call.recall", "Rappeler")}
											</Button>
										)}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			<Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>
							{t("iboite.call.newCallTitle", "Appeler un contact")}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleInitiateCall} className="space-y-4 pt-4">
						<div className="space-y-2">
							<Input
								type="email"
								placeholder={t(
									"iboite.call.emailPlaceholder",
									"Adresse email du contact",
								)}
								value={callEmail}
								onChange={(e) => setCallEmail(e.target.value)}
								autoComplete="off"
							/>
							<div className="text-xs text-muted-foreground">
								{t(
									"iboite.call.emailHelp",
									"Saisissez l'adresse email exacte de la personne que vous souhaitez appeler. Elle recevra une notification pour rejoindre l'appel.",
								)}
							</div>
						</div>
						<div className="flex justify-end gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCallDialogOpen(false)}
							>
								{t("iboite.actions.cancel", "Annuler")}
							</Button>
							<Button
								type="submit"
								disabled={isCalling || !callEmail.trim()}
								className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								{isCalling ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<PhoneCall className="size-4" />
								)}
								{t("iboite.call.startCall", "Appeler")}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Call Dialog/Sheet */}
			{isMobile ? (
				<Sheet
					open={!!activeCallId && !!(token && wsUrl)}
					onOpenChange={(o) => !o && handleHangUp()}
				>
					<SheetContent
						side="bottom"
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="p-0 h-dvh w-full bg-zinc-950 border-none rounded-none focus:outline-none flex flex-col pt-10"
					>
						{callContent}
					</SheetContent>
				</Sheet>
			) : (
				<Dialog
					open={!!activeCallId && !!(token && wsUrl)}
					onOpenChange={(open) => {
						if (!open) handleHangUp();
					}}
				>
					<DialogContent
						autoFocus={false}
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
						className="max-w-5xl sm:max-w-5xl w-full h-[80vh] p-0 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800"
					>
						{callContent}
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
