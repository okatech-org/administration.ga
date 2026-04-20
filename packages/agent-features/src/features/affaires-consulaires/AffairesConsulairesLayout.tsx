/**
 * Affaires Consulaires — Layout wrapper
 *
 * Pure wrapper that renders child routes. The hub content lives in
 * AffairesConsulairesPage. Shared between agent-web (Next.js) and
 * agent-desktop (Electron + react-router).
 */

export default function AffairesConsulairesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="flex flex-col h-full">{children}</div>;
}
