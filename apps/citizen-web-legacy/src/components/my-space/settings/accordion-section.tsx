import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionSectionProps {
	icon: React.ReactNode;
	title: string;
	description?: string;
	isOpen: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	color?: string;
}

export function AccordionSection({
	icon,
	title,
	description,
	isOpen,
	onToggle,
	children,
	color = "text-primary",
}: AccordionSectionProps) {
	return (
		<div className="border border-border/60 rounded-xl overflow-hidden transition-all duration-200">
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
					isOpen
						? "bg-primary/5 border-b border-border/40"
						: "hover:bg-muted/50",
				)}
			>
				<div
					className={cn(
						"p-1.5 rounded-lg shrink-0",
						isOpen ? "bg-primary/10" : "bg-muted",
					)}
				>
					<span
						className={cn(
							"block",
							isOpen ? color : "text-muted-foreground",
						)}
					>
						{icon}
					</span>
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold">{title}</p>
					{description && (
						<p className="text-xs text-muted-foreground mt-0.5 truncate">
							{description}
						</p>
					)}
				</div>
				<ChevronDown
					className={cn(
						"h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
						isOpen && "rotate-180",
					)}
				/>
			</button>
			<div
				className={cn(
					"transition-all duration-300 ease-in-out overflow-hidden",
					isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
				)}
			>
				<div className="p-4">{children}</div>
			</div>
		</div>
	);
}
