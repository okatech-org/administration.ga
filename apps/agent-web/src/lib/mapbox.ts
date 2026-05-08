/**
 * Mapbox configuration for agent-web (module Renseignement).
 *
 * Le token doit être renseigné dans `.env.local` :
 *   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxx
 *
 * Sans token, la page IntelligenceMap affiche son fallback tabulaire.
 */
export const MAPBOX_CONFIG = {
	accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
	styleLight: "mapbox://styles/mapbox/light-v11",
	styleDark: "mapbox://styles/mapbox/dark-v11",
};

export function isMapboxConfigured(): boolean {
	return MAPBOX_CONFIG.accessToken.length > 0;
}

/**
 * Coordonnées approximatives des capitales — fallback pour les profils
 * sans GPS, pour qu'ils s'affichent à minima sur la carte.
 *
 * Volontairement minimaliste — la migration `backfillProfileCoordinates`
 * éliminera la plupart des cas en remplissant les coordonnées GPS réelles.
 */
const CAPITAL_COORDS: Record<string, [number, number]> = {
	GA: [9.4673, 0.4162], // Libreville
	FR: [2.3522, 48.8566], // Paris
	BE: [4.3517, 50.8503], // Bruxelles
	CH: [7.4474, 46.9479], // Berne
	CA: [-75.6972, 45.4215], // Ottawa
	US: [-77.0369, 38.9072], // Washington
	GB: [-0.1276, 51.5074], // Londres
	DE: [13.405, 52.52], // Berlin
	ES: [-3.7038, 40.4168], // Madrid
	IT: [12.4964, 41.9028], // Rome
	PT: [-9.1393, 38.7223], // Lisbonne
	NL: [4.9041, 52.3676], // Amsterdam
	MA: [-6.8326, 33.9716], // Rabat
	SN: [-17.4441, 14.6928], // Dakar
	CI: [-5.547, 6.8276], // Yamoussoukro
	CN: [116.4074, 39.9042], // Pékin
	JP: [139.6917, 35.6895], // Tokyo
	BR: [-47.9292, -15.7801], // Brasília
	ZA: [28.0473, -26.2041], // Johannesburg
};

export function getCapitalCoords(country?: string): [number, number] | null {
	if (!country) return null;
	return CAPITAL_COORDS[country.toUpperCase()] ?? null;
}
