"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Phone, Building2, Landmark, MapPin, ArrowLeft, ArrowRight } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { OrgCallButton } from "@/components/meetings/org-call-button"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

// ── Icon & color per role ────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, {
	icon: typeof Building2;
	color: string;
	bg: string;
}> = {
	demarches: { icon: Building2, color: "text-muted-foreground", bg: "bg-citizen-s2" },
	residence: { icon: Landmark, color: "text-muted-foreground", bg: "bg-citizen-s2" },
	sejour: { icon: MapPin, color: "text-muted-foreground", bg: "bg-citizen-s2" },
}

function removeAccents(str: string): string {
	return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function splitRepName(name: string): { type: string; location: string } {
	const match = name.match(/^(.+?)\s+(du|de)\s+(.+)$/i)
	if (match) {
		return { type: removeAccents(match[1]).toUpperCase(), location: removeAccents(`${match[2]} ${match[3]}`).toUpperCase() }
	}
	return { type: removeAccents(name).toUpperCase(), location: "" }
}

function formatAddress(address?: { street?: string; city?: string; postalCode?: string; country?: string }): string | null {
	if (!address) return null
	const parts = [address.street, [address.postalCode, address.city].filter(Boolean).join(" ")].filter(Boolean)
	return parts.length > 0 ? parts.join(", ") : null
}

/**
 * MobileCallFAB — Floating "Appeler" button on the right edge (mobile only).
 * When tapped, opens a bottom sheet with one org card at a time + carousel arrows.
 */
export function MobileCallFAB({ variant = "horizontal" }: { variant?: "horizontal" | "vertical" }) {
	const { t } = useTranslation()
	const [isOpen, setIsOpen] = useState(false)

	const { data: representations, isPending } = useAuthenticatedConvexQuery(
		api.functions.representations.getMyRepresentations,
		{},
	)

	const items = representations ?? []

	// Carousel state
	const [activeIndex, setActiveIndex] = useState(0)
	const scrollRef = useRef<HTMLDivElement>(null)

	const scrollToIndex = useCallback((idx: number) => {
		const el = scrollRef.current
		if (!el) return
		const child = el.children[idx] as HTMLElement
		if (child) {
			el.scrollTo({ left: child.offsetLeft, behavior: "smooth" })
		}
	}, [])

	const handleScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el || !el.children.length) return
		const childWidth = (el.children[0] as HTMLElement).offsetWidth
		const idx = Math.round(el.scrollLeft / childWidth)
		setActiveIndex(Math.min(idx, items.length - 1))
	}, [items.length])

	if (isPending || items.length === 0) return null

	return (
		<>
			{/* Floating button — right edge */}
			<motion.button
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.15 }}
				onClick={() => setIsOpen(true)}
				className={cn(
					"fixed right-0 z-50 lg:hidden",
					variant === "vertical"
						? "top-[calc(33.33%-70px)] flex -translate-y-1/2 items-center justify-center rounded-l-full bg-[#0072B9]/25 px-1 py-8 text-xs font-bold tracking-widest text-[#0072B9] uppercase dark:bg-[#0072B9]/20 dark:text-[#5BA8E0]"
						: "flex items-center gap-1.5 rounded-l-full bg-[#0072B9]/15 pl-3 pr-2.5 py-3"
				)}
				style={variant === "horizontal" ? { top: "calc(env(safe-area-inset-top, 0px) + 130px)" } : undefined}
			>
				{variant === "vertical" ? (
					<span className="block rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
						Appeler
					</span>
				) : (
					<>
						<Phone className="h-4 w-4 text-[#0072B9] shrink-0" />
						<span className="text-sm font-bold text-[#0072B9] whitespace-nowrap">
							Appeler
						</span>
					</>
				)}
			</motion.button>

			{/* Bottom sheet with org cards */}
			<BottomSheet
				open={isOpen}
				onOpenChange={setIsOpen}
				title={t("common.contact")}
				icon={
					<div className="rounded-lg bg-[#0072B9]/10 p-1">
						<Phone className="h-3.5 w-3.5 text-[#0072B9]" />
					</div>
				}
			>
				<div className="px-4 py-3 sm:px-5">
					{/* Carousel — one card at a time */}
					<div
						ref={scrollRef}
						onScroll={handleScroll}
						className="disable-scrollbars flex snap-x snap-mandatory gap-4 overflow-x-auto"
					>
						{items.map((rep) => {
							const config = ROLE_CONFIG[rep.role] ?? ROLE_CONFIG.residence
							const Icon = config.icon
							const { type, location } = splitRepName(rep.name)
							const address = formatAddress(rep.address)

							return (
								<div
									key={rep.id}
									className="w-full shrink-0 snap-start"
								>
									<div className="flex flex-col gap-4 rounded-xl bg-citizen-s4 p-4">
										{/* Icon + name */}
										<div className="flex items-start gap-3">
											<div className={cn("shrink-0 rounded-lg p-2", config.bg)}>
												<Icon className={cn("h-5 w-5", config.color)} />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-bold uppercase tracking-wide text-foreground leading-tight">
													{type}
												</p>
												{location && (
													<p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
														{location}
													</p>
												)}
											</div>
										</div>

										{/* Address */}
										{address && (
											<div className="flex items-start gap-2.5 text-sm text-muted-foreground">
												<MapPin className="h-4 w-4 shrink-0 mt-0.5" />
												<span className="leading-snug">{address}</span>
											</div>
										)}

										{/* Call button */}
										<OrgCallButton
											orgId={rep.id as Id<"orgs">}
											orgName={rep.name}
											orgAddress={rep.address}
											className="h-11 text-sm font-semibold bg-[#0072B9] hover:bg-[#0072B9]/90 text-white transition-transform active:scale-[0.97] rounded-xl w-full"
											label="Appeler"
										/>
									</div>
								</div>
							)
						})}
					</div>

					{/* Navigation: dots + arrows */}
					{items.length > 1 && (
						<div className="mt-3 flex items-center justify-center gap-3">
							<button
								onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
								disabled={activeIndex === 0}
								className="flex h-7 w-7 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
							>
								<ArrowLeft className="h-3.5 w-3.5" />
							</button>
							<div className="flex items-center gap-1.5">
								{items.map((_, idx) => (
									<div
										key={idx}
										className={cn(
											"h-1.5 rounded-full transition-all",
											idx === activeIndex ? "w-5 bg-[#0072B9]" : "w-1.5 bg-muted-foreground/30",
										)}
									/>
								))}
							</div>
							<button
								onClick={() => scrollToIndex(Math.min(items.length - 1, activeIndex + 1))}
								disabled={activeIndex === items.length - 1}
								className="flex h-7 w-7 items-center justify-center rounded-full bg-citizen-s2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
							>
								<ArrowRight className="h-3.5 w-3.5" />
							</button>
						</div>
					)}
				</div>
			</BottomSheet>
		</>
	)
}
