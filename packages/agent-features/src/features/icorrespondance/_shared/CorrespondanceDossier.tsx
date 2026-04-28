import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@workspace/ui/components/badge";

interface CorrespondanceDossierProps {
	reference: string;
	title: string;
	type: string;
	sender: string;
	recipient: string;
	date: string;
	status: string;
	priority: string;
	documentCount: number;
	isCopy?: boolean;
	recipientStatus?: string;
	onClick?: () => void;
}

const RECIPIENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
	en_transit: { label: "En transit", color: "text-zinc-400 bg-zinc-500/15" },
	recu: { label: "Reçu", color: "text-blue-400 bg-blue-500/15" },
	en_attente: { label: "En attente", color: "text-orange-400 bg-orange-500/15" },
	approuve: { label: "Approuvé", color: "text-emerald-400 bg-emerald-500/15" },
	repondu: { label: "Répondu", color: "text-primary bg-primary/15" },
};

const TYPE_LABELS: Record<string, string> = {
	note_verbale: "NV",
	lettre_officielle: "LO",
	circulaire: "CIRC",
	telegramme: "TLG",
	memorandum: "MEM",
	communique: "COM",
};

function DynamicFolderIcon({ count, size = 64, hovered = false, className = "", isCopy = false }: { count: number; size?: number; className?: string; hovered?: boolean; isCopy?: boolean }) {
	const sheets = Math.min(Math.max(count, 0), 3);
	const sheetConfigs = [
		{ x: 62, y: 148, w: 300, h: 200, rx: 15, rotate: -3, fill: "#ffeac5", hoverY: -18 },
		{ x: 42, y: 168, w: 300, h: 200, rx: 15, rotate: 0, fill: "#fff7e6", hoverY: -14 },
		{ x: 52, y: 158, w: 290, h: 195, rx: 15, rotate: 3, fill: "#ffffff", hoverY: -22 },
	];
	const visibleSheets = sheets === 0 ? [] : sheets === 1 ? [sheetConfigs[1]] : sheets === 2 ? [sheetConfigs[0], sheetConfigs[1]] : [sheetConfigs[0], sheetConfigs[1], sheetConfigs[2]];

	const baseColor = isCopy ? "#9ca3af" : "#f6c012";
	const frontColor = isCopy ? "#d1d5db" : "#fbd87c";

	return (
		<motion.svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={className} initial={{ scale: 1 }} whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
			<path d="m214.2 107-40.2-29.9c-9.5-7-20.9-10.8-32.7-10.8h-110.2c-16.6 0-30 13.4-30 30v349.5h404.1c15.2 0 27.4-12.3 27.4-27.4v-270.6c0-16.6-13.4-30-30-30h-155.6c-11.8 0-23.3-3.8-32.8-10.8z" fill={baseColor} />
			{visibleSheets.map((sheet, i) => (
				<motion.rect key={i} x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} rx={sheet.rx} fill={sheet.fill} style={{ transformOrigin: `${sheet.x + sheet.w / 2}px ${sheet.y + sheet.h}px` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: hovered ? sheet.hoverY : 0, rotate: sheet.rotate + (hovered ? sheet.rotate * 0.5 : 0) }} transition={{ opacity: { duration: 0.3, delay: i * 0.08 }, y: { type: "spring", stiffness: 300, damping: 20 }, rotate: { type: "spring", stiffness: 300, damping: 20 } }} />
			))}
			<path d="m85.2 220.1-84.1 225.6h410.8c12.5 0 23.7-7.8 28.1-19.5l69-185.2c7.3-19.6-7.2-40.5-28.1-40.5h-367.6c-12.5.1-23.7 7.8-28.1 19.6z" fill={frontColor} />
		</motion.svg>
	);
}

export function CorrespondanceDossier({
	reference,
	title,
	type,
	sender,
	recipient,
	date,
	status,
	priority,
	documentCount,
	isCopy = false,
	recipientStatus,
	onClick,
}: CorrespondanceDossierProps) {
	const [isHovered, setIsHovered] = useState(false);
	const rsCfg = recipientStatus ? RECIPIENT_STATUS_LABELS[recipientStatus] : null;
    // to silence linter
    void status;

	return (
		<div className="group relative flex flex-col items-center justify-start p-2 rounded-2xl w-full h-full">
			<motion.div
				role="button"
				tabIndex={0}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.97 }}
				onClick={onClick}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className="relative flex flex-col items-center justify-start cursor-pointer outline-none rounded-xl p-3 hover:bg-muted/40 transition-colors w-full sm:w-[160px] md:w-[180px]"
			>
				{/* Badges on top of folder */}
				<div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10 w-full text-center">
					<div className="flex flex-col gap-0.5 items-center justify-center pointer-events-auto scale-90 -mt-2">
						{isCopy && (
							<span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 bg-muted/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm border border-border/50">
								Copie
							</span>
						)}
					</div>
				</div>

				<div className="relative mt-2 w-full flex justify-center">
					<DynamicFolderIcon count={documentCount} size={104} hovered={isHovered} isCopy={isCopy} className="drop-shadow-lg" />
					<div className="absolute -top-1 right-1 flex flex-col gap-0.5 items-end z-10">
						{documentCount > 0 && (
							<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="min-w-5 h-5 px-1.5 flex items-center justify-center gap-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
								<Mail className="h-2.5 w-2.5" />{documentCount}
							</motion.span>
						)}
					</div>
				</div>

				{/* Title and details below folder */}
				<div className="flex flex-col items-center mt-3 w-full">
					<div className="flex items-center gap-1 flex-wrap justify-center mb-1">
						{rsCfg && (
							<span className={`text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded shadow-sm border ${rsCfg.color}`}>
								{rsCfg.label}
							</span>
						)}
						<Badge variant="outline" className="text-[8px] px-1 py-0 h-4 font-mono shadow-xs border-primary/20 bg-primary/5">
							{TYPE_LABELS[type] ?? type}
						</Badge>
						<span className="text-[9px] text-muted-foreground/80 font-mono truncate max-w-[100px]" title={reference}>
							{reference}
						</span>
					</div>

					<span className="text-sm font-semibold text-foreground text-center leading-tight line-clamp-2 w-full px-1" title={title}>
						{title}
					</span>

					<div className="flex flex-wrap items-center justify-center gap-1 mt-2 w-full">
						{priority === "urgent" && (
							<span className="text-[9px] h-4 px-1.5 rounded-full bg-red-500/15 text-red-500 font-medium">
								Urgent
							</span>
						)}
						{priority === "confidentiel" && (
							<span className="text-[9px] h-4 px-1.5 rounded-full bg-amber-500/15 text-amber-500 font-medium">
								Confidentiel
							</span>
						)}
						<span className="text-[9px] text-muted-foreground/70 font-medium flex items-center gap-0.5">
							{date}
						</span>
					</div>

					{/* Sender -> Recipient route */}
					<div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 mt-1.5 bg-muted/40 px-2 py-0.5 rounded-md max-w-full">
						<span className="truncate max-w-[60px]" title={sender}>{sender}</span>
						<Send className="h-2 w-2 shrink-0 opacity-50" />
						<span className="truncate max-w-[60px]" title={recipient}>{recipient}</span>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
