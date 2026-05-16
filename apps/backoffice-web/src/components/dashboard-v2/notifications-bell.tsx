"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Icon } from "./icon";

const PAGE_SIZE = 12;

function fmtRelative(ts: number): string {
	const diff = Date.now() - ts;
	const s = Math.floor(diff / 1000);
	if (s < 60) return "à l'instant";
	const m = Math.floor(s / 60);
	if (m < 60) return `il y a ${m} min`;
	const h = Math.floor(m / 60);
	if (h < 24) return `il y a ${h} h`;
	const d = Math.floor(h / 24);
	if (d < 30) return `il y a ${d} j`;
	return new Date(ts).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/**
 * Cloche notifications du back-office.
 *
 * Bouton icone avec badge "non lus" + popover ancré qui se déroule
 * depuis l'icône (Radix `Popover` aligné à droite). Pas de modale
 * centrée.
 */
export function NotificationsBell() {
	const [open, setOpen] = useState(false);
	const unread = useQuery(api.functions.notifications.getUnreadCount, {});
	const count = unread ?? 0;

	const { results, status, loadMore } = usePaginatedQuery(
		api.functions.notifications.list,
		open ? {} : "skip",
		{ initialNumItems: PAGE_SIZE },
	);
	const markAsRead = useMutation(api.functions.notifications.markAsRead);
	const markAll = useMutation(api.functions.notifications.markAllAsRead);

	const loadingFirst = status === "LoadingFirstPage";
	const canLoadMore = status === "CanLoadMore";

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="btn btn-icon btn-soft"
					aria-label={
						count > 0
							? `${count} notification${count > 1 ? "s" : ""} non lue${count > 1 ? "s" : ""}`
							: "Notifications"
					}
					style={{ position: "relative" }}
				>
					<Icon name="Bell" size={16} />
					{count > 0 && (
						// Pastille discrète : juste un point rouge en haut-droite,
						// sans chiffre (le détail est dans le popover).
						<span
							aria-hidden="true"
							style={{
								position: "absolute",
								top: 6,
								right: 6,
								width: 7,
								height: 7,
								borderRadius: 100,
								background: "var(--danger-v2)",
								boxShadow: "0 0 0 1.5px var(--surface)",
							}}
						/>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="dash-v2"
				style={{
					width: 380,
					padding: 0,
					background: "var(--surface)",
					border: "1px solid var(--border-strong)",
					borderRadius: 12,
					boxShadow: "var(--shadow-lg)",
					maxHeight: "min(70vh, 560px)",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				{/* Header */}
				<div
					className="row items-center justify-between"
					style={{
						padding: "12px 14px",
						borderBottom: "1px solid var(--border-soft)",
						gap: 8,
					}}
				>
					<div className="row items-center" style={{ gap: 8 }}>
						<span style={{ fontWeight: 600, fontSize: 13 }}>Notifications</span>
						{count > 0 && (
							<span
								style={{
									fontSize: 10.5,
									padding: "1px 7px",
									borderRadius: 100,
									background: "var(--gabon-blue-v2-tint)",
									color: "var(--gabon-blue-v2)",
									fontWeight: 600,
								}}
							>
								{count > 99 ? "99+" : count}
							</span>
						)}
					</div>
					{count > 0 && (
						<button
							type="button"
							className="btn btn-text btn-sm"
							onClick={() => markAll({})}
							style={{ padding: "4px 8px", minHeight: 24, fontSize: 11.5 }}
						>
							Tout marquer lu
						</button>
					)}
				</div>

				{/* Liste */}
				<div
					style={{ flex: 1, minHeight: 0, overflow: "auto" }}
					className="citizen-scrollbar"
				>
					{loadingFirst ? (
						<div
							className="ta-center"
							style={{ padding: 32, color: "var(--text-muted)" }}
						>
							<Icon name="Loader" size={18} />
							<div className="text-sm" style={{ marginTop: 6 }}>
								Chargement…
							</div>
						</div>
					) : results.length === 0 ? (
						<div
							className="ta-center"
							style={{ padding: 32, color: "var(--text-muted)" }}
						>
							<Icon name="Bell" size={24} color="var(--text-faint)" />
							<div className="text-sm" style={{ marginTop: 8 }}>
								Aucune notification
							</div>
						</div>
					) : (
						<ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
							{results.map((n) => (
								<li
									key={n._id}
									style={{
										display: "flex",
										gap: 10,
										padding: "10px 14px",
										borderBottom: "1px solid var(--border-soft)",
										background: n.isRead ? "transparent" : "var(--gabon-blue-v2-soft)",
										transition: "background 100ms",
									}}
								>
									<div
										style={{
											width: 7,
											height: 7,
											borderRadius: 100,
											background: n.isRead ? "transparent" : "var(--gabon-blue-v2)",
											marginTop: 7,
											flexShrink: 0,
										}}
									/>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: 13,
												fontWeight: n.isRead ? 500 : 600,
												color: "var(--text)",
												lineHeight: 1.3,
											}}
										>
											{n.title}
										</div>
										<div
											style={{
												fontSize: 12,
												color: "var(--text-muted)",
												marginTop: 2,
												lineHeight: 1.45,
											}}
										>
											{n.body}
										</div>
										<div
											className="row items-center"
											style={{
												gap: 10,
												marginTop: 5,
												fontSize: 10.5,
												color: "var(--text-faint)",
											}}
										>
											<span className="text-mono">{fmtRelative(n.createdAt)}</span>
											{n.link && (
												<Link
													href={n.link}
													onClick={() => {
														markAsRead({
															notificationId: n._id as Id<"notifications">,
														});
														setOpen(false);
													}}
													style={{
														color: "var(--gabon-blue-v2)",
														fontWeight: 500,
														display: "inline-flex",
														alignItems: "center",
														gap: 3,
													}}
												>
													Ouvrir <Icon name="ArrowUpRight" size={10} />
												</Link>
											)}
											{!n.isRead && (
												<button
													type="button"
													onClick={() =>
														markAsRead({
															notificationId: n._id as Id<"notifications">,
														})
													}
													style={{
														appearance: "none",
														background: "transparent",
														border: "none",
														color: "var(--text-muted)",
														cursor: "pointer",
														fontSize: 10.5,
														padding: 0,
													}}
												>
													Marquer lu
												</button>
											)}
										</div>
									</div>
								</li>
							))}
						</ul>
					)}

					{canLoadMore && (
						<div
							className="row items-center justify-center"
							style={{ padding: "8px 14px 12px" }}
						>
							<button
								type="button"
								className="btn btn-text btn-sm"
								onClick={() => loadMore(PAGE_SIZE)}
								style={{ fontSize: 11.5, padding: "4px 8px", minHeight: 24 }}
							>
								<Icon name="ChevronRight" size={11} /> Charger plus
							</button>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
