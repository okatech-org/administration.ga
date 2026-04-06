import { Mail, MessageCircle, Monitor, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlatCard } from "@/components/my-space/flat-card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type NotifKey =
	| "emailNotifications"
	| "pushNotifications"
	| "smsNotifications"
	| "whatsappNotifications"
	| "shareAnalytics";

interface NotificationsTabProps {
	preferences:
		| {
				emailNotifications?: boolean;
				pushNotifications?: boolean;
				smsNotifications?: boolean;
				whatsappNotifications?: boolean;
		  }
		| undefined;
	onPrefToggle: (key: NotifKey, value: boolean) => void;
}

const CHANNELS = [
	{ key: "emailNotifications" as const, icon: Mail, defaultValue: true, labelKey: "settings.notifications.email", descKey: "settings.notifications.emailDesc" },
	{ key: "pushNotifications" as const, icon: Monitor, defaultValue: true, labelKey: "settings.notifications.push", descKey: "settings.notifications.pushDesc" },
	{ key: "smsNotifications" as const, icon: Smartphone, defaultValue: false, labelKey: "settings.notifications.sms", descKey: "settings.notifications.smsDesc" },
	{ key: "whatsappNotifications" as const, icon: MessageCircle, defaultValue: false, labelKey: "settings.notifications.whatsapp", descKey: "settings.notifications.whatsappDesc" },
];

export function NotificationsTab({ preferences, onPrefToggle }: NotificationsTabProps) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{CHANNELS.map((channel) => {
				const Icon = channel.icon;
				const isOn = preferences?.[channel.key] ?? channel.defaultValue;
				return (
					<FlatCard key={channel.key}>
						<div className="p-4">
							<div className="flex items-start gap-3">
								<div className={cn(
									"p-1.5 rounded-lg shrink-0",
									isOn ? "bg-primary/10" : "bg-foreground/[0.06] dark:bg-foreground/[0.12]",
								)}>
									<Icon className={cn("h-4 w-4", isOn ? "text-primary" : "text-muted-foreground")} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-bold">{t(channel.labelKey)}</p>
										<Switch
											checked={isOn}
											onCheckedChange={(checked) => onPrefToggle(channel.key, checked)}
										/>
									</div>
									<p className="text-xs text-muted-foreground mt-1">{t(channel.descKey)}</p>
								</div>
							</div>
						</div>
					</FlatCard>
				);
			})}
		</div>
	);
}
