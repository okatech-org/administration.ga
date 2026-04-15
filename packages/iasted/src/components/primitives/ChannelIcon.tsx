/**
 * ChannelIcon — icône unifiée pour les canaux iAsted.
 *
 * Remplace les 4-5 icônes différentes dispersées dans les tabs (MessageSquare,
 * Phone, Video, Contact, Mic, etc.) par une API cohérente.
 *
 * DS v3 §6 : icônes Lucide exclusivement.
 */

"use client";

import {
	MessageSquare,
	Phone,
	Video,
	Contact,
	Mic,
	Inbox,
	Settings,
	type LucideProps,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export type ChannelKind =
	| "chat"
	| "call"
	| "meeting"
	| "contact"
	| "voicemail"
	| "queue"
	| "settings";

const ICONS: Record<ChannelKind, React.ComponentType<LucideProps>> = {
	chat: MessageSquare,
	call: Phone,
	meeting: Video,
	contact: Contact,
	voicemail: Mic,
	queue: Inbox,
	settings: Settings,
};

export interface ChannelIconProps extends Omit<LucideProps, "ref"> {
	kind: ChannelKind;
	/** Taille pixel (défaut 16). */
	size?: number;
}

export function ChannelIcon({ kind, size = 16, className, ...rest }: ChannelIconProps) {
	const Icon = ICONS[kind];
	return <Icon size={size} className={cn("shrink-0", className)} {...rest} />;
}
