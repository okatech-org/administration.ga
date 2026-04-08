import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Clock,
	Globe,
	type LucideIcon,
	MapPin,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
	href?: string;
	color?: string;
	badge?: string;
	price?: string;
	delay?: string;
	onClick?: () => void;
	/** Whether this service is available for online requests */
	isAvailableOnline?: boolean;
}

export function ServiceCard({
	icon: Icon,
	title,
	description,
	href = "/",
	badge,
	price,
	delay,
	onClick,
	isAvailableOnline,
}: ServiceCardProps) {
	const { t } = useTranslation();

	const content = (
		<Card className="bg-card border border-border rounded-[10px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 h-full">
			<CardContent className="p-6">
				{/* Header with icon and badge */}
				<div className="flex items-start justify-between mb-4">
					<div
						className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 text-primary"
					>
						<Icon className="w-6 h-6" />
					</div>
					{badge && (
						<Badge variant="outline" className="text-xs">
							{badge}
						</Badge>
					)}
				</div>

				{/* Title */}
				<h3 className="text-base font-semibold text-foreground mb-2">
					{title}
				</h3>

				{/* Description */}
				<p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
					{description}
				</p>

				{/* Footer with price, delay and availability */}
				<div className="flex items-center justify-between text-sm mb-3">
					<div className="flex items-center gap-3">
						{delay && (
							<div className="flex items-center gap-1 text-muted-foreground">
								<Clock className="w-3.5 h-3.5" />
								<span>{delay}</span>
							</div>
						)}
						{price && (
							<span
								className={`font-medium ${price === "Gratuit" || price === "Free" ? "text-success" : "text-foreground"}`}
							>
								{price}
							</span>
						)}
					</div>
				</div>

				{/* Availability indicator */}
				{isAvailableOnline !== undefined && (
					<div className="mb-3">
						{isAvailableOnline ? (
							<div className="flex items-center gap-1.5 text-xs font-medium text-success">
								<Globe className="w-3.5 h-3.5" />
								<span>{t("services.availableOnline")}</span>
							</div>
						) : (
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
								<MapPin className="w-3.5 h-3.5" />
								<span>{t("services.onSiteOnly")}</span>
							</div>
						)}
					</div>
				)}

				{/* Link */}
				<span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
					{t("services.knowMore")}
					<ArrowRight className="w-4 h-4" />
				</span>
			</CardContent>
		</Card>
	);

	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className="block group text-left w-full cursor-pointer"
			>
				{content}
			</button>
		);
	}

	return (
		<Link to={href} className="block group">
			{content}
		</Link>
	);
}

export default ServiceCard;
