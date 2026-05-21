"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QrCode, RotateCcw } from "lucide-react";
import { useState } from "react";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

interface ConsularCardPreviewProps {
	userId: Id<"users">;
}

// Card model images (to be replaced with actual storage URLs)
const CARD_RECTO_URL =
	"https://greedy-horse-339.convex.cloud/api/storage/91438165-c30d-4aab-91e0-0a8e5806c1ec";
const CARD_VERSO_URL =
	"https://greedy-horse-339.convex.cloud/api/storage/1423b4ef-2701-46ef-ac6f-10d759e61c09";

export function ConsularCardPreview({ userId }: ConsularCardPreviewProps) {
	const [isFlipped, setIsFlipped] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const { data: profile } = useAuthenticatedConvexQuery(
		api.functions.profiles.getByUserId,
		{ userId },
	);

	const handleFlip = () => setIsFlipped(!isFlipped);

	// Loading state
	if (profile === undefined) {
		return (
			<Button variant="outline" size="sm" disabled>
				<Skeleton className="h-4 w-24" />
			</Button>
		);
	}

	// No card available
	if (!profile?.consularCard) {
		return null;
	}

	const { consularCard, identity } = profile;
	const isExpired = consularCard.cardExpiresAt < Date.now();

	const formatDate = (timestamp: number) => {
		return format(new Date(timestamp), "dd/MM/yyyy", { locale: fr });
	};

	const fullName = [identity?.firstName, identity?.lastName]
		.filter(Boolean)
		.join(" ");

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<QrCode className="h-4 w-4" />
					Carte consulaire
					{isExpired && (
						<Badge variant="destructive" className="ml-1">
							Expirée
						</Badge>
					)}
				</Button>
			</SheetTrigger>

			<SheetContent
				side="bottom"
				className="w-full max-w-[600px] mx-auto h-auto max-h-[500px] rounded-t-xl"
			>
				<SheetHeader className="pb-4">
					<SheetTitle className="text-center">Carte Consulaire</SheetTitle>
				</SheetHeader>

				<div className="flex flex-col items-center gap-6 pb-6">
					{/* Card container with perspective */}
					<button
						type="button"
						className="relative w-full max-w-[400px] cursor-pointer bg-transparent border-0 p-0"
						style={{ perspective: "1000px" }}
						onClick={handleFlip}
					>
						<div
							className={cn(
								"relative w-full transition-transform duration-500",
								"[transform-style:preserve-3d]",
								isFlipped && "[transform:rotateY(180deg)]",
							)}
						>
							{/* Front side (Recto) */}
							<div className="relative aspect-[1.6/1] w-full [backface-visibility:hidden] rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-green-800 to-green-900">
								{/* Background image */}
								<img
									src={CARD_RECTO_URL}
									alt="Card front"
									className="absolute inset-0 w-full h-full object-cover"
								/>

								{/* Overlay with profile data */}
								<div className="absolute inset-0 p-4 flex flex-col justify-between">
									{/* Top section - Title */}
									<div className="text-center">
										<p className="text-xs text-white/80 font-medium uppercase tracking-wider">
											République Gabonaise
										</p>
										<p className="text-[10px] text-white/60">
											Consulat Général du Gabon en France
										</p>
									</div>

									{/* Middle section - Photo & Info */}
									<div className="flex items-center gap-4">
										{/* Photo placeholder */}
										<div className="w-20 h-24 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
											<span className="text-white/50 text-xs">Photo</span>
										</div>

										{/* Info */}
										<div className="flex-1 text-white space-y-1">
											<p className="font-bold text-lg uppercase truncate">
												{identity?.lastName || "NOM"}
											</p>
											<p className="text-sm">
												{identity?.firstName || "Prénom"}
											</p>
											<p className="text-xs text-white/70">
												N° {consularCard.cardNumber}
											</p>
										</div>
									</div>

									{/* Bottom section - Dates */}
									<div className="flex justify-between text-xs text-white/80">
										<div>
											<p className="text-[10px] text-white/50">Délivrée le</p>
											<p>{formatDate(consularCard.cardIssuedAt)}</p>
										</div>
										<div className="text-right">
											<p className="text-[10px] text-white/50">Expire le</p>
											<p
												className={cn(
													isExpired && "text-red-400 font-semibold",
												)}
											>
												{formatDate(consularCard.cardExpiresAt)}
											</p>
										</div>
									</div>
								</div>

								{/* QR Code */}
								<div className="absolute bottom-3 right-3 bg-white rounded p-1 shadow-sm">
									<QRCode
										value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify-profile/${profile._id}`}
										size={48}
										className="h-12 w-12"
									/>
								</div>
							</div>

							{/* Back side (Verso) */}
							<div
								className={cn(
									"absolute inset-0 aspect-[1.6/1] w-full [backface-visibility:hidden] [transform:rotateY(180deg)]",
									"rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-green-700 to-green-800",
								)}
							>
								<img
									src={CARD_VERSO_URL}
									alt="Card back"
									className="absolute inset-0 w-full h-full object-cover"
								/>

								{/* Back content */}
								<div className="absolute inset-0 p-4 flex flex-col justify-center items-center">
									<div className="bg-white/90 rounded-lg p-4 text-center max-w-[80%]">
										<p className="text-xs text-gray-600 mb-2">
											Cette carte est la propriété du Consulat Général du Gabon
										</p>
										<p className="text-[10px] text-gray-500">
											En cas de perte, merci de la retourner à l'adresse
											ci-dessous
										</p>
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-[10px] text-gray-600">
												Consulat Général du Gabon
											</p>
											<p className="text-[10px] text-gray-500">
												26 bis, avenue Raphaël - 75016 Paris
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</button>

					{/* Instructions */}
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<RotateCcw className="h-4 w-4" />
						<span>Cliquez sur la carte pour la retourner</span>
					</div>

					{/* Card details */}
					<div className="w-full max-w-[400px] grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground text-xs">Numéro de carte</p>
							<p className="font-mono font-medium">{consularCard.cardNumber}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Titulaire</p>
							<p className="font-medium">{fullName || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Délivrée le</p>
							<p className="font-medium">
								{formatDate(consularCard.cardIssuedAt)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Statut</p>
							{isExpired ? (
								<Badge variant="destructive">Expirée</Badge>
							) : (
								<Badge variant="default" className="bg-green-600">
									Valide
								</Badge>
							)}
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
