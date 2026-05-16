"use client";

import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	ArrowUpRight,
	Award,
	Ban,
	Banknote,
	Bell,
	BookOpen,
	Briefcase,
	Camera,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Clock,
	Code2,
	Download,
	ExternalLink,
	Factory,
	Filter,
	Flag,
	Globe2,
	GraduationCap,
	Hammer,
	HeartPulse,
	Hotel,
	Info,
	Landmark,
	LayoutDashboard,
	Loader,
	Lock,
	MoreHorizontal,
	Palette,
	Phone,
	RefreshCcw,
	Scale,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Sprout,
	Stethoscope,
	TrendingUp,
	Truck,
	User as UserIcon,
	Users,
	X,
	Zap,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/**
 * Registre nommé d'icônes lucide partagé entre toutes les pages
 * Dashboard V2. Permet de passer un nom de string (ex: `"Briefcase"`)
 * en prop, plus pratique que d'importer chaque icône au cas par cas.
 */
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	ArrowUpRight,
	Award,
	Ban,
	Banknote,
	Bell,
	BookOpen,
	Briefcase,
	Camera,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	CircleSlash: Ban,
	Clock,
	Code2,
	Download,
	ExternalLink,
	Factory,
	Filter,
	Flag,
	Globe2,
	GraduationCap,
	Hammer,
	HeartPulse,
	Hotel,
	Info,
	Landmark,
	LayoutDashboard,
	Loader,
	Lock,
	MoreHorizontal,
	Palette,
	Phone,
	RefreshCcw,
	Scale,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Sprout,
	Stethoscope,
	TrendingUp,
	Truck,
	User: UserIcon,
	Users,
	X,
	Zap,
};

export function Icon({
	name,
	size = 16,
	className,
	color,
}: {
	name: string;
	size?: number;
	className?: string;
	color?: string;
}) {
	const Cmp = ICONS[name] ?? Info;
	return (
		<Cmp
			width={size}
			height={size}
			className={className}
			style={color ? { color } : undefined}
			strokeWidth={2}
		/>
	);
}
