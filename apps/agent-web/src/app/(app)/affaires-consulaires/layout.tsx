/**
 * Affaires Consulaires — Layout wrapper
 *
 * Pure wrapper that renders child routes. The hub content lives in page.tsx.
 */

export default function AffairesConsulairesLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col h-full">
			{children}
		</div>
	);
}
