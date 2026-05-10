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
	WindowShell,
	buildCircleMenuItems,
	citizenPreset,
	defaultTriggerClassName,
	defaultTriggerIcon,
	type IAstedTabId,
} from "@workspace/iasted";

import { CitizenChatTab } from "./CitizenChatTab";
import { CitizenCallTab } from "./CitizenCallTab";
import { CitizenContactTab } from "./CitizenContactTab";

type CitizenTabId = Extract<IAstedTabId, "ichat" | "icall" | "icontact">;

export function CitizenIAstedWindow() {
	const router = useRouter();
	const { t } = useTranslation();

	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<CitizenTabId>("ichat");

	const openWithTab = useCallback((tab: IAstedTabId) => {
		// Citizen n'expose que 3 tabs ; filtrage safe (les tabs inconnues sont ignorées).
		if (tab === "ichat" || tab === "icall" || tab === "icontact") {
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

	return (
		<>
			{/* CircleMenu FAB — desktop only (mobile uses nav bar) */}
			{!open && (
				<div
					suppressHydrationWarning
					className="fixed bottom-[62px] right-[62px] z-40 hidden lg:block pointer-events-none"
				>
					<CircleMenu
						items={menuItems}
						openIcon={defaultTriggerIcon("citizen")}
						triggerClassName={defaultTriggerClassName("citizen")}
					/>
				</div>
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
				}}
			/>
		</>
	);
}
