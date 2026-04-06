import {
	Activity,
	Award,
	Banknote,
	BarChart3,
	Bell,
	BookOpen,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CalendarDays,
	CalendarHeart,
	ChartLine,
	CheckCircle,
	ClipboardList,
	Cog,
	CreditCard,
	Crown,
	Eye,
	FileEdit,
	FileText,
	FileUser,
	Gavel,
	Globe,
	HandHelping,
	Handshake,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	LineChart,
	Link,
	Lock,
	type LucideIcon,
	Mail,
	Medal,
	Megaphone,
	Newspaper,
	Phone,
	ScrollText,
	Settings,
	Shield,
	ShieldAlert,
	Stamp,
	Star,
	Ticket,
	User,
	Users,
	Video,
	Wallet,
	Wrench,
} from "lucide-react";

/**
 * Maps a Lucide icon name string (e.g. "Crown", "Shield") to the actual component.
 * Used for rendering icons stored as strings in the backend (roles, templates, etc.).
 */
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
	Activity,
	Award,
	Banknote,
	BarChart3,
	Bell,
	BookOpen,
	Briefcase,
	Building,
	Building2,
	Calendar,
	CalendarDays,
	CalendarHeart,
	CheckCircle,
	ChartLine,
	ClipboardList,
	Cog,
	CreditCard,
	Crown,
	Eye,
	FileEdit,
	FileText,
	FileUser,
	Gavel,
	Globe,
	HandHelping,
	Handshake,
	Home,
	Landmark,
	Layers,
	LayoutDashboard,
	LifeBuoy,
	Link,
	Lock,
	Mail,
	Medal,
	Megaphone,
	Newspaper,
	Phone,
	ScrollText,
	Settings,
	Shield,
	ShieldAlert,
	Stamp,
	Star,
	Ticket,
	User,
	Users,
	Video,
	Wallet,
	Wrench,
	LineChart,
};

/**
 * Renders a Lucide icon from its name string.
 * Returns null and a console warning if the name is not found.
 */
export function DynamicLucideIcon({
	name,
	className,
	size,
}: {
	name: string;
	className?: string;
	size?: number;
}) {
	const IconComponent = LUCIDE_ICON_MAP[name];
	if (!IconComponent) {
		return <span className={className}>{name}</span>;
	}
	return <IconComponent className={className} size={size} />;
}

/**
 * Returns the Lucide icon component for a given name string.
 * Falls back to a default icon if not found.
 */
export function getLucideIcon(name: string, fallback?: LucideIcon): LucideIcon {
	return LUCIDE_ICON_MAP[name] ?? fallback ?? FileText;
}
