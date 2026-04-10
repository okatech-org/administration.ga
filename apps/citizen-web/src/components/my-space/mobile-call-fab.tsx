"use client"

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Phone, Building2, Landmark, MapPin, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { OrgCallButton } from "@/components/meetings/org-call-button"
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks"
import { cn } from "@/lib/utils"

// ── Icon & color per role ────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, {
	icon: typeof Building2;
	color: string;
	bg: string;
}> = {
	demarches: { icon: Building2, color: "text-muted-foreground", bg: "bg-[#EBE6DC] dark:bg-[#383633]" },
	residence: { icon: Landmark, color: "text-muted-foreground", bg: "bg-[#EBE6DC] dark:bg-[#383633]" },
	sejour: { icon: MapPin, color: "text-muted-foreground", bg: "bg-[#EBE6DC] dark:bg-[#383633]" },
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

/**
 * MobileCallFAB — Floating "Appeler" button on the right edge (mobile only).
 * When tapped, opens a bottom sheet displaying all user representations
 * with their call buttons, mirroring the desktop AssistanceContactsWidget.
 */
export function MobileCallFAB() {
	const [isOpen, setIsOpen] = useState(false)

	const { data: representations, isPending } = useAuthenticatedConvexQuery(
		api.functions.representations.getMyRepresentations,
		{},
	)

	// Get the consular org name ("Géré par")
	const { data: registrations } = useAuthenticatedConvexQuery(
		api.functions.consularRegistrations.listByProfile,
		{},
	)
	const latestRegistration = registrations?.[0]
	const { data: registrationRequest } = useAuthenticatedConvexQuery(
		api.functions.requests.getById,
		latestRegistration?.requestId
			? { requestId: latestRegistration.requestId }
			: "skip",
	)
	const orgName = (registrationRequest?.org as any)?.name

	const items = representations ?? []

	// Scroll pagination for the cards
	const [activeIndex, setActiveIndex] = useState(0)
	const scrollRef = useRef<HTMLDivElement>(null)
	const handleScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el || items.length <= 1) return
		const idx = Math.round(el.scrollLeft / el.clientWidth)
		setActiveIndex(Math.min(idx, items.length - 1))
	}, [items.length])

	if (isPending || items.length === 0) return null

	return (
		<>
			{/* Floating button — right edge, horizontal, at hero card level */}
			<motion.button
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.15 }}
				onClick={() => setIsOpen(true)}
				className="fixed right-0 z-50 flex items-center gap-1.5 rounded-l-full bg-[#0072B9]/15 pl-3 pr-2.5 py-3 shadow-sm lg:hidden"
				style={{ top: "calc(env(safe-area-inset-top, 0px) + 130px)" }}
			>
				<Phone className="h-4 w-4 text-[#0072B9] shrink-0" />
				<span className="text-sm font-bold text-[#0072B9] whitespace-nowrap">
					Appeler
				</span>
			</motion.button>

			{/* Bottom sheet overlay */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-40 bg-black/40 lg:hidden"
							onClick={() => setIsOpen(false)}
						/>

						{/* Sheet content */}
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={{ type: "spring", damping: 28, stiffness: 350 }}
							className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-[#F4F3ED] dark:bg-[#2B2A28]/27 shadow-2xl lg:hidden"
						>
							{/* Drag handle */}
							<div className="flex justify-center pt-3 pb-1">
								<div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
							</div>

							{/* Header */}
							<div className="flex items-center justify-between px-5 pb-3">
								<div className="flex items-center gap-2">
									<div className="rounded-lg bg-[#0072B9]/10 p-1.5">
										<Phone className="h-4 w-4 text-[#0072B9]" />
									</div>
									<h3 className="text-base font-bold text-foreground">Contacter</h3>
								</div>
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									aria-label="Fermer"
									className="rounded-lg p-1.5 transition-colors hover:bg-muted-foreground/10"
								>
									<X className="h-4.5 w-4.5 text-muted-foreground" />
								</button>
							</div>

							{/* Géré par */}
							{orgName && (
								<div className="px-5 pb-3">
									<div className="flex items-center gap-2.5 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 px-3.5 py-2">
										<Building2 className="h-3.5 w-3.5 text-[#0072B9] shrink-0" />
										<span className="text-xs font-semibold text-[#0072B9] truncate">
											Géré par : {orgName}
										</span>
									</div>
								</div>
							)}

							{/* Representations list */}
							<div className="px-5 pb-28 pt-1">
								<div
									ref={scrollRef}
									onScroll={handleScroll}
									className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory disable-scrollbars"
								>
									{items.map((rep) => {
										const config = ROLE_CONFIG[rep.role] ?? ROLE_CONFIG.residence
										const Icon = config.icon
										const { type, location } = splitRepName(rep.name)

										return (
											<div
												key={rep.id}
												className={cn(
													"bg-[#FDFCFA] dark:bg-[#21201E]/77 rounded-xl snap-start shrink-0 flex flex-col gap-3 p-4",
													items.length === 1 ? "w-full" : "min-w-[80%]",
												)}
											>
												{/* Icon + name */}
												<div className="flex items-start gap-2.5">
													<div className={`p-1.5 rounded-lg ${config.bg} shrink-0 mt-0.5`}>
														<Icon className={`h-4.5 w-4.5 ${config.color}`} />
													</div>
													<div className="flex flex-col -gap-px min-w-0">
														<span className="text-xs font-bold uppercase tracking-wide text-foreground leading-tight line-clamp-1">
															{type}
														</span>
														<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight line-clamp-1">
															{location}
														</p>
													</div>
												</div>

												{/* Call button */}
												<OrgCallButton
													orgId={rep.id as Id<"orgs">}
													orgName={rep.name}
													orgAddress={rep.address}
													className="h-10 text-sm font-semibold bg-[#0072B9] hover:bg-[#0072B9]/90 text-white transition-transform active:scale-[0.97] rounded-lg w-full"
													label="Appeler"
												/>
											</div>
										)
									})}
								</div>

								{/* Dots pagination */}
								{items.length > 1 && (
									<div className="flex justify-center gap-1.5 pt-3">
										{items.map((_, idx) => (
											<div key={idx} className={cn("h-1.5 rounded-full transition-all", idx === activeIndex ? "w-4 bg-[#0072B9]" : "w-1.5 bg-muted-foreground/30")} />
										))}
									</div>
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}
