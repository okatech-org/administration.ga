/**
 * HomeLandingSignIn — Expérience 5 volets horizontale premium (agent-web).
 *
 * Thin wrapper au-dessus de `<HomeLandingSignIn>` du package
 * `@workspace/agent-features/shell`. Injecte :
 *  - la Navbar agent-web,
 *  - les 5 sections (Hero/Missions/Features/Ressources/Tutoriels),
 *
 * Le scaffold (scroll snap, IntersectionObserver, dots, nav clavier,
 * skip link) vit dans le package pour être réutilisé par agent-desktop.
 */

import {
	HomeLandingSignIn as SharedHomeLandingSignIn,
	type HomeLandingSignInPanel,
} from "@workspace/agent-features/shell";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { MissionsSection } from "@/components/landing/MissionsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { RessourcesPanel } from "@/components/landing/RessourcesPanel";
import { TutorielsPanel } from "@/components/landing/TutorielsPanel";

const panels: HomeLandingSignInPanel[] = [
	{
		key: "hero",
		label: "Accueil",
		render: ({ signInRef, onNext }) => (
			<HeroSection ref={signInRef} onNext={onNext} />
		),
	},
	{
		key: "missions",
		label: "Missions",
		render: () => <MissionsSection />,
	},
	{
		key: "values",
		label: "Valeurs",
		render: () => <FeaturesSection />,
	},
	{
		key: "resources",
		label: "Ressources",
		render: () => <RessourcesPanel />,
	},
	{
		key: "tutorials",
		label: "Tutoriels",
		render: () => <TutorielsPanel />,
	},
];

export function HomeLandingSignIn() {
	return (
		<SharedHomeLandingSignIn
			panels={panels}
			renderNavbar={({ activePanel, onNavigate, onScrollToSignIn }) => (
				<Navbar
					activePanel={activePanel}
					onNavigate={onNavigate}
					onScrollToSignIn={onScrollToSignIn}
				/>
			)}
		/>
	);
}
