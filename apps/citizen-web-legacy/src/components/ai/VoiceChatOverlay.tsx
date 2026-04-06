/**
 * Voice Chat Overlay Component
 * Full-screen overlay for voice-to-voice interaction with Gemini Live API
 */
import { Mic, Phone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceState =
	| "idle"
	| "connecting"
	| "listening"
	| "processing"
	| "speaking"
	| "error";

interface VoiceChatOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	state: VoiceState;
	error: string | null;
}

// Animated orb that shows the current voice state
function VoiceOrb({ state }: { state: VoiceState }) {
	const getOrbStyles = () => {
		switch (state) {
			case "connecting":
				return {
					bgClass: "bg-blue-500/20",
					ringClass: "ring-blue-500",
					pulseClass: "bg-blue-500",
				};
			case "listening":
				return {
					bgClass: "bg-green-500/20",
					ringClass: "ring-green-500",
					pulseClass: "bg-green-500",
				};
			case "processing":
				return {
					bgClass: "bg-yellow-500/20",
					ringClass: "ring-yellow-500",
					pulseClass: "bg-yellow-500",
				};
			case "speaking":
				return {
					bgClass: "bg-purple-500/20",
					ringClass: "ring-purple-500",
					pulseClass: "bg-purple-500",
				};
			case "error":
				return {
					bgClass: "bg-red-500/20",
					ringClass: "ring-red-500",
					pulseClass: "bg-red-500",
				};
			default:
				return {
					bgClass: "bg-muted/50",
					ringClass: "ring-muted-foreground",
					pulseClass: "bg-muted-foreground",
				};
		}
	};

	const { bgClass, ringClass, pulseClass } = getOrbStyles();
	const isActive = state === "listening" || state === "speaking";

	return (
		<div className="relative flex items-center justify-center">
			{/* Outer pulse rings for active states */}
			<AnimatePresence>
				{isActive && (
					<>
						<motion.div
							initial={{ scale: 1, opacity: 0.4 }}
							animate={{ scale: 2, opacity: 0 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
							className={cn("absolute h-32 w-32 rounded-full", pulseClass)}
						/>
						<motion.div
							initial={{ scale: 1, opacity: 0.3 }}
							animate={{ scale: 2.5, opacity: 0 }}
							transition={{
								duration: 1.5,
								repeat: Infinity,
								ease: "easeOut",
								delay: 0.3,
							}}
							className={cn("absolute h-32 w-32 rounded-full", pulseClass)}
						/>
					</>
				)}
			</AnimatePresence>

			{/* Main orb */}
			<motion.div
				animate={
					state === "speaking"
						? { scale: [1, 1.1, 1, 1.15, 1] }
						: state === "listening"
							? { scale: [1, 1.05, 1] }
							: {}
				}
				transition={
					state === "speaking"
						? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
						: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
				}
				className={cn(
					"relative flex h-32 w-32 items-center justify-center rounded-full ring-4",
					bgClass,
					ringClass,
				)}
			>
				{/* Inner icon */}
				<motion.div
					animate={state === "processing" ? { rotate: 360 } : {}}
					transition={
						state === "processing"
							? { duration: 2, repeat: Infinity, ease: "linear" }
							: {}
					}
				>
					{state === "speaking" ? (
						<SoundWaves />
					) : (
						<Mic
							className={cn(
								"h-12 w-12",
								state === "error" ? "text-red-500" : "text-foreground",
							)}
						/>
					)}
				</motion.div>
			</motion.div>
		</div>
	);
}

// Sound wave animation for speaking state
function SoundWaves() {
	return (
		<div className="flex items-center gap-1">
			{[0, 1, 2, 3, 4].map((i) => (
				<motion.div
					key={i}
					animate={{ scaleY: [0.3, 1, 0.3] }}
					transition={{
						duration: 0.5,
						repeat: Infinity,
						delay: i * 0.1,
						ease: "easeInOut",
					}}
					className="h-10 w-2 rounded-full bg-purple-500"
				/>
			))}
		</div>
	);
}

// Status message based on current state
function StatusMessage({
	state,
	error,
}: {
	state: VoiceState;
	error: string | null;
}) {
	const getMessage = () => {
		switch (state) {
			case "connecting":
				return "Connexion en cours...";
			case "listening":
				return "Je vous écoute...";
			case "processing":
				return "Je réfléchis...";
			case "speaking":
				return "Je parle...";
			case "error":
				return error || "Une erreur est survenue";
			default:
				return "Appuyez sur le micro pour commencer";
		}
	};

	return (
		<motion.p
			key={state}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				"text-xl font-medium",
				state === "error" ? "text-red-500" : "text-foreground",
			)}
		>
			{getMessage()}
		</motion.p>
	);
}

export function VoiceChatOverlay({
	isOpen,
	onClose,
	state,
	error,
}: VoiceChatOverlayProps) {
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
			>
				{/* Close button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="absolute right-4 top-4"
					aria-label="Fermer"
				>
					<X className="h-6 w-6" />
				</Button>

				{/* Main content */}
				<div className="flex flex-col items-center gap-8">
					{/* Title */}
					<motion.h2
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-2xl font-semibold text-foreground"
					>
						Assistant Vocal
					</motion.h2>

					{/* Animated orb */}
					<VoiceOrb state={state} />

					{/* Status message */}
					<StatusMessage state={state} error={error} />

					{/* End call button */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<Button
							variant="destructive"
							size="lg"
							onClick={onClose}
							className="mt-8 gap-2 rounded-full px-8"
						>
							<Phone className="h-5 w-5 rotate-[135deg]" />
							Terminer
						</Button>
					</motion.div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
