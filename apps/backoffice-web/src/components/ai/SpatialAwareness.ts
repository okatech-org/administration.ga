/**
 * SpatialAwareness — Conscience spatiale d'iAsted (backoffice).
 * Routes et suggestions adaptées au contexte administration.
 */

interface PageContext {
	module: string;
	capabilities: string[];
	suggestions: string[];
}

const PAGE_CONTEXT: Record<string, PageContext> = {
	"/": {
		module: "Dashboard",
		capabilities: ["voir les KPIs globaux", "consulter l'état du réseau"],
		suggestions: ["Statistiques globales", "État des représentations"],
	},
	"/orgs": {
		module: "Représentations",
		capabilities: ["gérer les organismes", "voir les membres"],
		suggestions: ["Représentations actives", "Ajouter un organisme"],
	},
	"/users": {
		module: "Utilisateurs",
		capabilities: ["gérer les comptes", "attribuer des rôles"],
		suggestions: ["Utilisateurs actifs", "Comptes en attente"],
	},
	"/icorrespondance": {
		module: "iCorrespondance",
		capabilities: ["gérer les correspondances", "suivre les dossiers"],
		suggestions: ["Correspondances récentes", "Dossiers en attente"],
	},
	"/idocument": {
		module: "iDocument",
		capabilities: ["parcourir les documents", "gérer le stockage"],
		suggestions: ["Documents récents", "Espace de stockage"],
	},
	"/iagenda": {
		module: "iAgenda",
		capabilities: ["voir les événements", "planifier"],
		suggestions: ["Événements du jour", "Prochain rendez-vous"],
	},
	"/settings": {
		module: "Paramètres",
		capabilities: ["configurer la plateforme", "gérer les modules"],
		suggestions: ["Configuration système", "Modules actifs"],
	},
	"/audit": {
		module: "Audit",
		capabilities: ["consulter les logs", "analyser les accès"],
		suggestions: ["Logs récents", "Activités suspectes"],
	},
	"/monitoring": {
		module: "Monitoring",
		capabilities: ["vérifier la santé système", "analyser les performances"],
		suggestions: ["État du système", "Alertes actives"],
	},
	"/posts": {
		module: "Publications",
		capabilities: ["rédiger des articles", "modérer le contenu"],
		suggestions: ["Publications récentes", "Créer un article"],
	},
};

export function getPageContext(pathname: string): PageContext {
	return PAGE_CONTEXT[pathname] ??
		Object.entries(PAGE_CONTEXT).find(([key]) => pathname.startsWith(key))?.[1] ??
		{ module: "Général", capabilities: [], suggestions: ["Statistiques globales", "État des représentations"] };
}

export function getSuggestions(pathname: string): string[] {
	return getPageContext(pathname).suggestions;
}
