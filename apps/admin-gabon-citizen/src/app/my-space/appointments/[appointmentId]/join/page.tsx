"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useConvexActionQuery } from "@/integrations/convex/hooks";
import { AlertCircle, Loader2, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MeetingRoom } from "@/components/meetings/meeting-room";

export default function AppointmentJoinPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const { appointmentId } = useParams<{ appointmentId: string }>();

	const { mutateAsync: createToken, isPending } = useConvexActionQuery(
		api.actions.livekit.createCitizenJoinToken,
	);
	const [token, setToken] = useState<{
		token: string;
		roomName: string;
		wsUrl: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await createToken({
					appointmentId: appointmentId as Id<"appointments">,
				});
				if (!cancelled) setToken(res);
			} catch (err: unknown) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Unknown error");
				}
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [appointmentId]);

	if (isPending || (!token && !error)) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
				<AlertCircle className="h-10 w-10 text-destructive" />
				<p className="text-sm text-muted-foreground max-w-md text-center">
					{t(`appointments.join.errors.${error}`, error)}
				</p>
				<Button
					variant="outline"
					onClick={() =>
						router.push(`/my-space/appointments/${appointmentId}`)
					}
				>
					{t("common.back")}
				</Button>
			</div>
		);
	}

	if (!token) return null;

	return (
		<div className="flex flex-1 flex-col h-screen p-4">
			<div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
				<Video className="h-4 w-4" />
				<span>{t("appointments.join.connected")}</span>
			</div>
			<div className="flex-1 min-h-0">
				<MeetingRoom
					token={token.token}
					wsUrl={token.wsUrl}
					onDisconnect={() =>
						router.push(`/my-space/appointments/${appointmentId}`)
					}
				/>
			</div>
		</div>
	);
}
