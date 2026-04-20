"use client"

import { api } from "@convex/_generated/api"
import { Link } from "@workspace/routing"
import {
	ArrowLeft,
	CheckCircle2,
	CreditCard,
	Loader2,
	Printer,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useOrg } from "../../shell/org-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FlatCard } from "../../components/my-space/flat-card"
import { SectionHeader } from "../../components/my-space/section-header"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table"
import {
	useConvexMutationQuery,
	useConvexQuery,
} from "@workspace/api/hooks"

// biome-ignore lint/suspicious/noExplicitAny: card shape returned by Convex query
type PrintQueueCard = any

export default function PrintQueuePage() {
	const { activeOrgId } = useOrg()
	const [selectedCard, setSelectedCard] = useState<PrintQueueCard | null>(null)
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)

	const { data: printQueue } = useConvexQuery(
		api.functions.consularRegistrations.getReadyForPrint,
		activeOrgId
			? { orgId: activeOrgId, paginationOpts: { numItems: 100, cursor: null } }
			: "skip",
	)

	const { mutateAsync: markAsPrinted, isPending } = useConvexMutationQuery(
		api.functions.consularRegistrations.markAsPrinted,
	)

	const handleMarkAsPrinted = async () => {
		if (!selectedCard) return
		try {
			await markAsPrinted({ registrationId: selectedCard._id })
			toast.success("Carte marquée comme imprimée", {
				description: `N° ${selectedCard.cardNumber}`,
			})
			setShowConfirmDialog(false)
			setSelectedCard(null)
		} catch {
			toast.error("Erreur lors de la mise à jour")
		}
	}

	const queueCount = printQueue?.page?.length ?? 0

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/consular-registry">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<Printer className="h-6 w-6" />
						File d'impression
					</h1>
					<p className="text-muted-foreground">
						Cartes consulaires prêtes à imprimer via EasyCard
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<FlatCard>
					<div className="p-3 lg:p-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium">En attente</span>
							<CreditCard className="h-4 w-4 text-muted-foreground" />
						</div>
						<div className="text-2xl font-bold">{queueCount}</div>
						<p className="text-xs text-muted-foreground font-medium">
							cartes à imprimer
						</p>
					</div>
				</FlatCard>
			</div>

			<FlatCard>
				<div className="p-3 lg:p-4">
					<SectionHeader
						icon={<Printer className="h-4 w-4" />}
						title="Cartes en attente d'impression"
					/>
					<p className="text-xs text-muted-foreground mb-3">
						Marquez les cartes comme imprimées après les avoir envoyées à
						EasyCard
					</p>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Citoyen</TableHead>
								<TableHead>N° Carte</TableHead>
								<TableHead>Date génération</TableHead>
								<TableHead>Expire le</TableHead>
								<TableHead className="text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{printQueue === undefined ? (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center">
										<div className="flex justify-center items-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin" />
											Chargement...
										</div>
									</TableCell>
								</TableRow>
							) : printQueue.page.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-24 text-center text-muted-foreground"
									>
										<CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
										Aucune carte en attente d'impression
									</TableCell>
								</TableRow>
							) : (
								printQueue.page.map((card: PrintQueueCard) => (
									<TableRow key={card._id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarImage src={card.user?.avatarUrl} />
													<AvatarFallback>
														{card.profile?.identity?.firstName?.[0]}
														{card.profile?.identity?.lastName?.[0]}
													</AvatarFallback>
												</Avatar>
												<div>
													<span className="font-medium">
														{card.profile?.identity?.firstName}{" "}
														{card.profile?.identity?.lastName}
													</span>
													<p className="text-xs text-muted-foreground">
														{card.user?.email}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
												{card.cardNumber}
											</code>
										</TableCell>
										<TableCell>
											{card.cardIssuedAt
												? new Date(card.cardIssuedAt).toLocaleDateString(
														"fr-FR",
													)
												: "—"}
										</TableCell>
										<TableCell>
											{card.cardExpiresAt ? (
												<Badge variant="outline">
													{new Date(card.cardExpiresAt).toLocaleDateString(
														"fr-FR",
													)}
												</Badge>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												className="active:scale-[0.97] transition-transform"
												onClick={() => {
													setSelectedCard(card)
													setShowConfirmDialog(true)
												}}
											>
												<Printer className="h-4 w-4 mr-1" />
												Marquer imprimé
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</FlatCard>

			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirmer l'impression</DialogTitle>
						<DialogDescription>
							Marquer la carte{" "}
							<code className="font-mono">{selectedCard?.cardNumber}</code> pour{" "}
							<strong>
								{selectedCard?.profile?.identity?.firstName}{" "}
								{selectedCard?.profile?.identity?.lastName}
							</strong>{" "}
							comme imprimée ?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowConfirmDialog(false)}
						>
							Annuler
						</Button>
						<Button onClick={handleMarkAsPrinted} disabled={isPending}>
							{isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<CheckCircle2 className="h-4 w-4 mr-2" />
							)}
							Confirmer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
