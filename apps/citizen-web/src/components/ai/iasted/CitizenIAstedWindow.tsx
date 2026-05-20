/**
 * CitizenIAstedWindow — coquille fine au-dessus de `@workspace/iasted`.
 *
 * Items CircleMenu construits via `buildCircleMenuItems({surface: "citizen"})` :
 * identiques en structure aux versions agent/backoffice, seules les cibles
 * varient selon la surface.
 */

"use client";

import { useRouter } from "next/navigation";
import { Bot, Contact, MessageSquare, Mic, Phone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	IAstedFanMenu,
	VoiceFloatingTranscription,
	VoiceTab,
	WindowShell,
	citizenPreset,
	useIAstedVoiceController,
	type IAstedFanMenuItem,
	type IAstedTabId,
} from "@workspace/iasted";
import { pageContextStore } from "@workspace/agent-features/stores";

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

	// Pendant de `iasted:open` : permet au tool vocal `close_chat`
	// de fermer la fenêtre flottante. Sans ce listener, le dispatch
	// CustomEvent("iasted:close") repartait dans le vide.
	useEffect(() => {
		const handler = () => setOpen(false);
		window.addEventListener("iasted:close", handler);
		return () => window.removeEventListener("iasted:close", handler);
	}, []);

	// Nettoyage du snapshot panel à la fermeture — évite qu'un onglet
	// reste « ouvert » côté contexte iAsted alors que l'UI est fermée.
	useEffect(() => {
		if (!open) {
			pageContextStore.setPanelSnapshot(null);
		}
	}, [open]);

	const handleExpand = useCallback(() => {
		setOpen(false);
		router.push("/my-space/iasted");
	}, [router]);

	// Items de l'éventail iAsted — 4 fonctions citoyennes qui rayonnent autour
	// du bouton central : iChat, iContact, iAppel, iVocal. Identique au pattern
	// backoffice (IAstedFanMenu) mais avec un sous-ensemble adapté au citoyen
	// (pas de iRéunion ni Réglages — ces tabs n'existent pas dans citizenPreset).
	const fanMenuItems: IAstedFanMenuItem[] = useMemo(
		() => [
			{
				id: "ichat",
				label: t("iasted.tabs.ichat", "iChat"),
				icon: <MessageSquare className="h-4 w-4" />,
				className: "bg-emerald-600",
			},
			{
				id: "icontact",
				label: t("iasted.tabs.icontact", "iContact"),
				icon: <Contact className="h-4 w-4" />,
				className: "bg-primary",
			},
			{
				id: "icall",
				label: t("iasted.tabs.icall", "iAppel"),
				icon: <Phone className="h-4 w-4" />,
				className: "bg-blue-500",
			},
			{
				id: "ivoice",
				label: t("iasted.tabs.ivoice", "iVocal"),
				icon: <Mic className="h-4 w-4" />,
				className: "bg-violet-600",
			},
		],
		[t],
	);

	const isVoiceConnected = voiceController?.isConnected === true;
	// FAB visible quand la fenêtre est fermée OU pendant une session
	// vocale active (pour permettre raccrochage rapide depuis le FAB).
	const showFab = !open || isVoiceConnected;

	return (
		<>
			{/* IAstedFanMenu — sphère 3D draggable (port mairie.ga, identique au backoffice).
			    Single click → active/raccroche la voix ; double click → déploie l'éventail
			    des 4 fonctions citoyennes ; drag → repositionne et persiste en localStorage.
			    Le composant gère lui-même son positionnement (position: fixed via
			    IAstedButtonFull). */}
			{showFab && voiceController && (
				<IAstedFanMenu
					size="md"
					layout="corner"
					positionStorageKey="iasted-button-position-citizen"
					voiceListening={voiceController.voiceState === "listening"}
					voiceSpeaking={voiceController.voiceState === "speaking"}
					voiceProcessing={
						voiceController.voiceState === "thinking" ||
						voiceController.voiceState === "processing" ||
						voiceController.voiceState === "connecting"
					}
					audioLevel={voiceController.audioLevel}
					isVoiceConnected={isVoiceConnected}
					items={fanMenuItems}
					onItemSelect={(item) => {
						openWithTab(item.id as IAstedTabId);
					}}
					onSingleClick={() => {
						// Mode conversationnel direct : active la voix (ou raccroche
						// si session en cours). Aligné sur la sémantique backoffice.
						if (voiceController.isConnected) {
							void voiceController.deactivateVoice();
						} else if (voiceController.available) {
							void voiceController.activateVoice();
						}
					}}
				/>
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
