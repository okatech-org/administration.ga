import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackofficeIAstedWindow } from "@/components/ai/BackofficeIAstedWindow";
import { SuperadminGuard } from "@/components/guards/SuperadminGuard";
import { SuperadminSidebar } from "@/components/sidebars/superadmin-sidebar";

const SIDEBAR_STORAGE_KEY = "superadmin-sidebar-expanded";

export const Route = createFileRoute("/_app")({
	component: SuperadminLayout,
});

function SuperadminLayout() {
	const [isExpanded, setIsExpanded] = useState(() => {
		try {
			const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
			return stored === null ? true : stored === "true";
		} catch {
			return true;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded));
		} catch {
			// Ignore localStorage errors
		}
	}, [isExpanded]);

	return (
		<SuperadminGuard>
			<div className="backoffice-layout relative overflow-hidden h-screen flex">
				<div className="hidden md:block p-4 pr-0">
					<div className="h-full rounded-2xl bg-[#F4F3ED] dark:bg-[#171616] overflow-hidden">
						<SuperadminSidebar
							isExpanded={isExpanded}
							onToggle={() => setIsExpanded((prev) => !prev)}
						/>
					</div>
				</div>
				<main className="flex-1 min-h-full overflow-y-auto citizen-scrollbar">
					<Outlet />
				</main>
				<BackofficeIAstedWindow />
			</div>
		</SuperadminGuard>
	);
}
