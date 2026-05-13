/**
 * CitizenIAstedWindow — coquille fine au-dessus de `@workspace/iasted`.
 *
 * Items CircleMenu construits via `buildCircleMenuItems({surface: "citizen"})` :
 * identiques en structure aux versions agent/backoffice, seules les cibles
 * varient selon la surface.
 */

"use client";

import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CircleMenu,
	VoiceFloatingTranscription,
	VoiceTab,
	WindowShell,
	buildCircleMenuItems,
	citizenPreset,
	defaultTriggerClassName,
	defaultTriggerIcon,
	useIAstedVoiceController,
	type IAstedTabId,
} from "@workspace/iasted";

import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenContactTab } from "./CitizenContactTab";

type CitizenTabId = Extract<
	IAstedTabId,
	"ichat" | "icall" | "icontact" | "ivoice"
>;

export function CitizenIAstedWindow() {
	const router = useRouter();
	const { t } = useTranslation();
	// Controller vocal — fourni par <CitizenIAstedVoiceProvider> mounté
	// dans `MySpaceWrapper`. `null` côté logged-out / outside provider.
	const voiceController = useIAstedVoiceController();

	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<CitizenTabId>("ichat");

	const openWithTab = useCallback((tab: IAstedTabId) => {
		// Citizen expose désormais 4 tabs ; filtrage safe.
		if (
			tab === "ichat" ||
			tab === "icall" ||
			tab === "icontact" ||
			tab === "ivoice"
		) {
			setActiveTab(tab);
			setOpen(true);
		}
	}, []);

	// Écoute l'événement du footer mobile (mobile-nav-bar.tsx) pour ouvrir la fenêtre.
	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: CitizenTabId }>).detail;
			openWithTab(detail?.tab ?? "ichat");
		};
		window.addEventListener("iasted:open", handler);
		return () => window.removeEventListener("iasted:open", handler);
	}, [openWithTab]);

	const handleExpand = useCallback(() => {
		setOpen(false);
		router.push("/my-space/iasted");
	}, [router]);

	const menuItems = buildCircleMenuItems({
		surface: "citizen",
		openWithTab,
		expand: handleExpand,
		resolveLabel: t,
	});

	const isVoiceConnected = voiceController?.isConnected === true;
	// FAB visible quand la fenêtre est fermée OU pendant une session
	// vocale active (pour permettre raccrochage rapide depuis le FAB).
	const showFab = !open || isVoiceConnected;

	return (
		<>
			{/* CircleMenu FAB — desktop only (mobile uses nav bar) */}
			{showFab && (
				<div
					suppressHydrationWarning
					className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block pointer-events-none"
				>
					<CircleMenu
						items={menuItems}
						openIcon={defaultTriggerIcon("citizen")}
						triggerClassName={defaultTriggerClassName("citizen")}
						triggerVariant={voiceController ? "3d-organic" : "default"}
						voiceState={voiceController?.voiceState ?? "idle"}
						audioLevel={voiceController?.audioLevel ?? 0}
						voiceDisabled={
							voiceController ? !voiceController.available : false
						}
						onLongPress={voiceController?.activateVoice}
						isVoiceConnected={isVoiceConnected}
						onVoiceHangUp={voiceController?.deactivateVoice}
					/>
				</div>
			)}

			{/* Overlay flottant — transcription + raccrocher pendant la
			    session vocale, indépendamment de l'état de la fenêtre. */}
			{isVoiceConnected && voiceController && (
				<VoiceFloatingTranscription
					messages={voiceController.messages}
					voiceState={voiceController.voiceState}
					onHangUp={() => {
						void voiceController.deactivateVoice();
					}}
				/>
			)}

			<WindowShell
				preset={citizenPreset}
				title="iAsted"
				subtitle={t("iasted.subtitle", "Assistant Consulaire")}
				headerIcon={<Bot />}
				open={open}
				onOpenChange={setOpen}
				activeTab={activeTab}
				onActiveTabChange={(tabId) => openWithTab(tabId)}
				onExpand={handleExpand}
				onClose={() => setOpen(false)}
				resolveLabel={(labelKey, fallback) => t(labelKey, fallback)}
				tabContent={{
					ichat: <CitizenChatTab />,
					icall: <CitizenCallTab />,
					icontact: <CitizenContactTab />,
					ivoice: <VoiceTab />,
				}}
			/>
		</>
	);
}
