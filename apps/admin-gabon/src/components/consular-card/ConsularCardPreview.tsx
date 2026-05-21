"use client";


import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	CreditCard,
	Download,
	Loader2,
	Printer,
	RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface CardData {
	cardNumber: string;
	cardIssuedAt: number;
	cardExpiresAt: number;
	printedAt?: number | null;
	identity: {
		firstName?: string | null;
		lastName?: string | null;
		birthDate?: number | null;
		birthPlace?: string | null;
		gender?: string | null;
		nationality?: string | null;
	};
	identityPhotoUrl?: string | null;
	org: {
		_id: string;
		name: string;
		shortName?: string | null;
		address?: {
			street: string;
			city: string;
			postalCode: string;
			country: string;
		};
		logoUrl?: string | null;
	};
	cardDesign?: {
		frontBackgroundImage?: string | null;
		backBackgroundImage?: string | null;
	} | null;
	verificationUrl?: string;
}

interface ConsularCardPreviewProps {
	data: CardData;
	size?: "sm" | "md" | "lg";
	showActions?: boolean;
	onPrint?: () => void;
	onDownloadAttestation?: () => void;
	isPrintEnabled?: boolean;
	isPrinting?: boolean;
	isGeneratingPDF?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function ConsularCardPreview({
	data,
	size = "md",
	showActions = true,
	onPrint,
	onDownloadAttestation,
	isPrintEnabled = true,
	isPrinting = false,
	isGeneratingPDF = false,
}: ConsularCardPreviewProps) {
	const [isFlipped, setIsFlipped] = useState(false);

	const handleFlip = () => setIsFlipped(!isFlipped);

	const fmtDate = (ts: number) =>
		format(new Date(ts), "dd/MM/yyyy", { locale: fr });

	const isExpired = data.cardExpiresAt < Date.now();
	const isPrinted = !!data.printedAt;

	const frontBg = data.cardDesign?.frontBackgroundImage ??
		"https://greedy-horse-339.convex.cloud/api/storage/91438165-c30d-4aab-91e0-0a8e5806c1ec";
	const backBg = data.cardDesign?.backBackgroundImage ??
		"https://greedy-horse-339.convex.cloud/api/storage/1423b4ef-2701-46ef-ac6f-10d759e61c09";

	const orgName = data.org.name;
	const orgShortName = data.org.shortName ?? orgName;
	const verificationUrl = data.verificationUrl ?? "";

	const sizeClasses = {
		sm: "max-w-[280px]",
		md: "max-w-[380px]",
		lg: "max-w-[480px]",
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Status badges */}
			<div className="flex items-center gap-2 justify-center">
				<Badge
					variant={isExpired ? "destructive" : "default"}
					className={cn(
						"text-[10px]",
						!isExpired && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
					)}
				>
					<CreditCard className="h-3 w-3 mr-1" />
					{isExpired ? "Expirée" : "Valide"}
				</Badge>
				{isPrinted ? (
					<Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/20">
						<Printer className="h-3 w-3 mr-1" />
						Imprimée
					</Badge>
				) : (
					<Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">
						Non imprimée
					</Badge>
				)}
			</div>

			{/* Card flip container */}
			<div className={cn("w-full flex justify-center perspective-[1000px]", sizeClasses[size])}>
				<button
					type="button"
					className="relative w-full aspect-[1.6/1] cursor-pointer bg-transparent border-0 p-0 group"
					onClick={handleFlip}
				>
					<div
						className={cn(
							"relative w-full h-full transition-transform duration-500",
							"transform-3d",
							isFlipped && "transform-[rotateY(180deg)]",
						)}
					>
						{/* Front */}
						<div className="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden shadow-lg border border-border/20">
							<img src={frontBg} alt="Recto" className="absolute inset-0 w-full h-full object-cover" />
							<div className="absolute inset-0 p-3.5 flex flex-col justify-between">
								<div className="text-center">
									<p className="text-[10px] text-gray-800/80 font-medium uppercase tracking-wider">
										République Gabonaise
									</p>
									<p className="text-[8px] text-gray-800/60 leading-tight">{orgName}</p>
								</div>
								<div className="flex items-center gap-3">
									<div className="w-16 h-20 rounded-md flex items-center justify-center border-2 border-white/30 shrink-0 overflow-hidden bg-white/20">
										{data.identityPhotoUrl ? (
											<img src={data.identityPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
										) : (
											<span className="text-gray-800/50 text-[9px] font-semibold">Photo</span>
										)}
									</div>
									<div className="flex-1 text-gray-800 space-y-0.5 text-left min-w-0">
										<p className="font-bold text-sm uppercase truncate">{data.identity.lastName || "NOM"}</p>
										<p className="text-xs truncate">{data.identity.firstName || "Prénom"}</p>
										{data.identity.birthDate && (
											<p className="text-[9px] text-gray-800/60 truncate">
												Né(e) le {fmtDate(data.identity.birthDate)}
												{data.identity.birthPlace ? ` à ${data.identity.birthPlace}` : ""}
											</p>
										)}
										<p className="text-[10px] font-mono text-gray-800/70 pt-0.5">
											N° {data.cardNumber}
										</p>
									</div>
								</div>
								<div className="flex justify-between text-[10px] text-gray-800/80">
									<div className="text-left">
										<p className="text-[8px] text-gray-800/50 uppercase font-semibold">Délivrée le</p>
										<p className="font-mono">{fmtDate(data.cardIssuedAt)}</p>
									</div>
									<div className="text-right">
										<p className="text-[8px] text-gray-800/50 uppercase font-semibold">Expire le</p>
										<p className="font-mono">{fmtDate(data.cardExpiresAt)}</p>
									</div>
								</div>
							</div>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
								<div className="flex flex-col items-center gap-2 text-white">
									<RotateCcw className="h-6 w-6" />
									<span className="text-xs font-medium">Voir le verso</span>
								</div>
							</div>
						</div>

						{/* Back */}
						<div className={cn(
							"absolute inset-0 w-full h-full backface-hidden transform-[rotateY(180deg)]",
							"rounded-xl overflow-hidden shadow-lg border border-border/20",
						)}>
							<img src={backBg} alt="Verso" className="absolute inset-0 w-full h-full object-cover" />
							<div className="absolute inset-0 p-4 flex flex-col justify-center items-center">
								<div className="bg-white/95 rounded-lg p-3 text-center max-w-[85%] shadow-sm">
									<p className="text-[10px] text-gray-700 font-medium mb-2 leading-tight">
										Cette carte est la propriété du {orgShortName}
									</p>
									{verificationUrl && (
										<div className="mt-2 flex justify-center">
											<div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
												<div className="w-12 h-12 rounded-sm"
													style={{
														backgroundImage: `url(https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verificationUrl)})`,
														backgroundSize: "cover",
													}}
												/>
											</div>
										</div>
									)}
									<div className="mt-2.5 pt-2.5 border-t border-gray-200">
										<p className="text-[9px] font-bold text-gray-700 uppercase">{orgShortName}</p>
										{data.org.address && (
											<p className="text-[9px] text-gray-600 mt-0.5">
												{data.org.address.street}<br/>{data.org.address.postalCode} {data.org.address.city}
											</p>
										)}
									</div>
								</div>
							</div>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
								<div className="flex flex-col items-center gap-2 text-white">
									<RotateCcw className="h-6 w-6" />
									<span className="text-xs font-medium">Voir le recto</span>
								</div>
							</div>
						</div>
					</div>
				</button>
			</div>

			{/* Flip button */}
			<div className="flex justify-center">
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-3 text-[11px] text-muted-foreground"
					onClick={handleFlip}
				>
					<RotateCcw className="h-3 w-3 mr-1.5" />
					{isFlipped ? "Voir le recto" : "Voir le verso"}
				</Button>
			</div>

			{/* Actions */}
			{showActions && (
				<div className="flex gap-2 justify-center">
					{onDownloadAttestation && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-[11px] gap-1.5"
							onClick={onDownloadAttestation}
							disabled={isGeneratingPDF}
						>
							{isGeneratingPDF ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Download className="h-3.5 w-3.5" />
							)}
							Attestation
						</Button>
					)}
					{onPrint && isPrintEnabled && (
						<Button
							size="sm"
							className="h-8 text-[11px] gap-1.5"
							onClick={onPrint}
							disabled={isPrinting || isPrinted}
						>
							{isPrinting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Printer className="h-3.5 w-3.5" />
							)}
							{isPrinted ? "Déjà imprimée" : "Envoyer à EasyCard"}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════
// Card Preview Dialog — Used in agent-web and backoffice-web
// ═══════════════════════════════════════════════════════════════

interface CardPreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	data: CardData | null;
	onPrint?: () => void;
	onDownloadAttestation?: () => void;
	isPrintEnabled?: boolean;
	isPrinting?: boolean;
	isGeneratingPDF?: boolean;
}

export function CardPreviewDialog({
	open,
	onOpenChange,
	data,
	onPrint,
	onDownloadAttestation,
	isPrintEnabled,
	isPrinting,
	isGeneratingPDF,
}: CardPreviewDialogProps) {
	if (!data) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						Carte Consulaire — {data.identity.firstName} {data.identity.lastName?.toUpperCase()}
					</DialogTitle>
					<DialogDescription>
						N° {data.cardNumber}
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-center py-4">
					<ConsularCardPreview
						data={data}
						size="lg"
						showActions={true}
						onPrint={onPrint}
						onDownloadAttestation={onDownloadAttestation}
						isPrintEnabled={isPrintEnabled}
						isPrinting={isPrinting}
						isGeneratingPDF={isGeneratingPDF}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
