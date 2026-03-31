/**
 * SpatialAwareness — Conscience spatiale d'iAsted.
 * Sait sur quelle page l'utilisateur se trouve et adapte les suggestions.
 */

interface PageContext {
	module: string;
	capabilities: string[];
	suggestions: string[];
}

const PAGE_CONTEXT: Record<string, PageContext> = {
	"/": {
		module: "Dashboard",
		capabilities: ["voir les KPIs", "consulter les demandes récentes", "exporter les statistiques"],
		suggestions: ["Résumé de la journée", "Demandes en attente"],
	},
	"/requests": {
		module: "Demandes",
		capabilities: ["traiter les demandes", "changer les statuts", "assigner", "ajouter des notes"],
		suggestions: ["Demandes en attente", "Statistiques des demandes"],
	},
	"/iboite": {
		module: "iBoîte",
		capabilities: ["lire les messages", "envoyer un mail sécurisé", "gérer les appels"],
		suggestions: ["Messages non lus", "Envoyer un courrier"],
	},
	"/icorrespondance": {
		module: "iCorrespondance",
		capabilities: ["créer une correspondance", "suivre l'approbation", "consulter les dossiers"],
		suggestions: ["Correspondances en attente", "Envoyer un courrier"],
	},
	"/idocument": {
		module: "iDocument",
		capabilities: ["parcourir les dossiers", "uploader des fichiers", "partager des documents"],
		suggestions: ["Documents récents", "Espace de stockage"],
	},
	"/iagenda": {
		module: "iAgenda",
		capabilities: ["consulter les rendez-vous", "planifier un événement"],
		suggestions: ["Rendez-vous du jour", "Prochain événement"],
	},
	"/appointments": {
		module: "Rendez-vous",
		capabilities: ["confirmer les RDV", "modifier les créneaux"],
		suggestions: ["Rendez-vous à confirmer", "Planning de la semaine"],
	},
	"/team": {
		module: "Équipe",
		capabilities: ["voir l'organigramme", "gérer les rôles"],
		suggestions: ["Membres de l'équipe", "Qui est disponible ?"],
	},
	"/consular-registry": {
		module: "Registre Consulaire",
		capabilities: ["rechercher un citoyen", "imprimer des cartes"],
		suggestions: ["Statistiques du registre", "Cartes à imprimer"],
	},
	"/statistics": {
		module: "Statistiques",
		capabilities: ["analyser les tendances", "exporter les données"],
		suggestions: ["Statistiques du mois", "Tendances"],
	},
	"/settings": {
		module: "Paramètres",
		capabilities: ["configurer l'organisation", "modifier les préférences"],
		suggestions: ["Configuration actuelle", "Rôles et permissions"],
	},
	"/posts": {
		module: "Actualités",
		capabilities: ["rédiger une publication", "gérer les articles"],
		suggestions: ["Publications récentes", "Rédiger une actualité"],
	},
	"/calls": {
		module: "Appels",
		capabilities: ["passer un appel", "voir l'historique"],
		suggestions: ["Appels récents", "Appeler un collègue"],
	},
	"/meetings": {
		module: "Réunions",
		capabilities: ["démarrer une réunion", "rejoindre une salle"],
		suggestions: ["Réunions en cours", "Créer une réunion"],
	},
	"/affaires-diplomatiques": {
		module: "Affaires Diplomatiques",
		capabilities: ["consulter les cibles", "voir les partenariats"],
		suggestions: ["Cibles diplomatiques", "Rapport trimestriel"],
	},
	"/payments": {
		module: "Paiements",
		capabilities: ["voir les recettes", "suivre les paiements"],
		suggestions: ["Paiements récents", "Total des recettes"],
	},
};

export function getPageContext(pathname: string): PageContext {
	return PAGE_CONTEXT[pathname] ??
		Object.entries(PAGE_CONTEXT).find(([key]) => pathname.startsWith(key))?.[1] ??
		{ module: "Général", capabilities: [], suggestions: ["Résumé de la situation", "Demandes en attente"] };
}

export function getSuggestions(pathname: string): string[] {
	return getPageContext(pathname).suggestions;
}
