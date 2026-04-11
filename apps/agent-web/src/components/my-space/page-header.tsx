import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	/** Page title */
	title: ReactNode;
	/** Optional subtitle displayed below the title */
	subtitle?: ReactNode;
	/** Optional icon displayed before the title — wrapped in a colored box */
	icon?: ReactNode;
	/** Background class for the icon box. Defaults to design system S2. */
	iconBgClass?: string;
	/** Actions to display on the right side */
	actions?: ReactNode;
	/** Show a back button that navigates to the previous page */
	showBackButton?: boolean;
	/** Custom back button handler (defaults to router.history.back()) */
	onBack?: () => void;
}

/**
 * Reusable page header — Citizen Design System v3.0.
 * Animated entry, icon in S2 box, title, subtitle, actions.
 */
export function PageHeader({
	title,
	subtitle,
	icon,
	iconBgClass = "bg-[#EBE6DC] dark:bg-[#383633]",
	actions,
	showBackButton = false,
	onBack,
}: PageHeaderProps) {
	const navigate = useNavigate();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			navigate({ to: ".." });
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex flex-col md:flex-row items-start justify-between gap-4"
		>
			<div className="flex items-start gap-2">
				{showBackButton && (
					<Button
						variant="ghost"
						size="icon"
						onClick={handleBack}
						className="-ml-1 mt-0.5 active:scale-[0.97] transition-transform"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
				)}
				<div>
					<h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
						{icon && (
							<div className={cn("p-1.5 rounded-md", iconBgClass)}>
								{icon}
							</div>
						)}
						{title}
					</h1>
					{subtitle && (
						<p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
					)}
				</div>
			</div>
			{actions && (
				<div className="flex items-center gap-2 flex-wrap">{actions}</div>
			)}
		</motion.div>
	);
}
