/**
 * ISO 3166-1 alpha-2 country code → capital city coordinates.
 * Format: [longitude, latitude] (Mapbox / GeoJSON convention).
 *
 * Used to position diplomatic agents on the world map when they only have
 * an `org.country` reference rather than a precise GPS address.
 */

export const COUNTRY_CAPITALS: Record<string, [number, number]> = {
	// ── Afrique ─────────────────────────────────────────
	ZA: [28.2293, -25.7479],   // Pretoria
	DZ: [3.0588, 36.7538],     // Alger
	AO: [13.2343, -8.8383],    // Luanda
	BJ: [2.6323, 6.4969],      // Porto-Novo
	BW: [25.9231, -24.6282],   // Gaborone
	BF: [-1.5197, 12.3714],    // Ouagadougou
	BI: [29.3644, -3.3614],    // Gitega
	CV: [-23.5133, 14.9177],   // Praia
	CM: [11.5174, 3.848],      // Yaoundé
	CF: [18.5582, 4.3947],     // Bangui
	TD: [15.0444, 12.1348],    // N'Djamena
	KM: [43.2551, -11.7022],   // Moroni
	CG: [15.2429, -4.2634],    // Brazzaville
	CD: [15.2663, -4.4419],    // Kinshasa
	CI: [-5.5471, 6.8276],     // Yamoussoukro (capitale officielle ; Abidjan reste plus connue : -4.0083, 5.3599)
	DJ: [43.1456, 11.5721],    // Djibouti
	EG: [31.2357, 30.0444],    // Le Caire
	GQ: [8.7832, 3.75],        // Malabo
	ER: [38.9251, 15.3229],    // Asmara
	SZ: [31.1367, -26.3054],   // Mbabane
	ET: [38.7578, 9.0227],     // Addis-Abeba
	GA: [9.4673, 0.4162],      // Libreville
	GM: [-16.5775, 13.4549],   // Banjul
	GH: [-0.1869, 5.6037],     // Accra
	GN: [-13.6785, 9.6412],    // Conakry
	GW: [-15.5984, 11.8636],   // Bissau
	KE: [36.8219, -1.2921],    // Nairobi
	LS: [27.4836, -29.31],     // Maseru
	LR: [-10.7969, 6.3009],    // Monrovia
	LY: [13.1913, 32.8872],    // Tripoli
	MG: [47.5079, -18.8792],   // Antananarivo
	MW: [33.7741, -13.2543],   // Lilongwe
	ML: [-7.9864, 12.6392],    // Bamako
	MR: [-15.9582, 18.0735],   // Nouakchott
	MU: [57.5022, -20.1609],   // Port-Louis
	MA: [-6.8498, 34.0209],    // Rabat
	MZ: [32.5732, -25.9692],   // Maputo
	NA: [17.0832, -22.5609],   // Windhoek
	NE: [2.1098, 13.5117],     // Niamey
	NG: [7.4951, 9.0579],      // Abuja
	RW: [29.8739, -1.9403],    // Kigali (29.8739, -1.9403 ≈ Bukavu ; Kigali = 30.0588, -1.9499)
	ST: [6.6131, 0.1864],      // São Tomé
	SN: [-17.4677, 14.7167],   // Dakar
	SC: [55.4513, -4.6796],    // Victoria
	SL: [-13.2317, 8.4657],    // Freetown
	SO: [45.3182, 2.0469],     // Mogadiscio
	SS: [31.5825, 4.8594],     // Juba
	SD: [32.5599, 15.5007],    // Khartoum
	TZ: [35.7516, -6.369],     // Dodoma
	TG: [1.2255, 6.1319],      // Lomé
	TN: [10.1658, 36.8065],    // Tunis
	UG: [32.5825, 0.3476],     // Kampala
	ZM: [28.3228, -15.3875],   // Lusaka
	ZW: [31.0532, -17.8252],   // Harare

	// ── Europe ──────────────────────────────────────────
	AL: [19.8187, 41.3275],    // Tirana
	AD: [1.5218, 42.5063],     // Andorre-la-Vieille
	AT: [16.3738, 48.2082],    // Vienne
	BY: [27.5615, 53.9045],    // Minsk
	BE: [4.3517, 50.8503],     // Bruxelles
	BA: [18.4131, 43.8563],    // Sarajevo
	BG: [23.3219, 42.6977],    // Sofia
	HR: [15.9819, 45.815],     // Zagreb
	CY: [33.4299, 35.1856],    // Nicosie
	CZ: [14.4378, 50.0755],    // Prague
	DK: [12.5683, 55.6761],    // Copenhague
	EE: [24.7536, 59.437],     // Tallinn
	FI: [24.9384, 60.1699],    // Helsinki
	FR: [2.3522, 48.8566],     // Paris
	DE: [13.405, 52.52],       // Berlin
	GR: [23.7275, 37.9838],    // Athènes
	HU: [19.0402, 47.4979],    // Budapest
	IS: [-21.9426, 64.1466],   // Reykjavik
	IE: [-6.2603, 53.3498],    // Dublin
	IT: [12.4964, 41.9028],    // Rome
	XK: [21.1655, 42.6629],    // Pristina
	LV: [24.1052, 56.9496],    // Riga
	LI: [9.5215, 47.141],      // Vaduz
	LT: [25.2797, 54.6872],    // Vilnius
	LU: [6.1296, 49.6116],     // Luxembourg
	MT: [14.5147, 35.8989],    // La Valette
	MD: [28.8638, 47.0105],    // Chișinău
	MC: [7.4128, 43.7333],     // Monaco
	ME: [19.2594, 42.4304],    // Podgorica
	NL: [4.9041, 52.3676],     // Amsterdam
	MK: [21.4254, 41.9981],    // Skopje
	NO: [10.7522, 59.9139],    // Oslo
	PL: [21.0122, 52.2297],    // Varsovie
	PT: [-9.1393, 38.7223],    // Lisbonne
	RO: [26.1025, 44.4268],    // Bucarest
	RU: [37.6173, 55.7558],    // Moscou
	SM: [12.4578, 43.9424],    // Saint-Marin
	RS: [20.4489, 44.7866],    // Belgrade
	SK: [17.1077, 48.1486],    // Bratislava
	SI: [14.5058, 46.0569],    // Ljubljana
	ES: [-3.7038, 40.4168],    // Madrid
	SE: [18.0686, 59.3293],    // Stockholm
	CH: [7.4474, 46.948],      // Berne
	UA: [30.5234, 50.4501],    // Kiev
	GB: [-0.1278, 51.5074],    // Londres
	VA: [12.4534, 41.9029],    // Cité du Vatican

	// ── Amériques ───────────────────────────────────────
	AG: [-61.8456, 17.1175],   // Saint John's
	AR: [-58.3816, -34.6037],  // Buenos Aires
	BS: [-77.3554, 25.0443],   // Nassau
	BB: [-59.5432, 13.1939],   // Bridgetown
	BZ: [-88.7669, 17.251],    // Belmopan
	BO: [-68.1193, -16.5],     // La Paz
	BR: [-47.9292, -15.8267],  // Brasilia
	CA: [-75.6972, 45.4215],   // Ottawa
	CL: [-70.6483, -33.4569],  // Santiago
	CO: [-74.0721, 4.711],     // Bogota
	CR: [-84.0907, 9.9281],    // San José
	CU: [-82.3666, 23.1136],   // La Havane
	DM: [-61.3879, 15.301],    // Roseau
	DO: [-69.9312, 18.4861],   // Saint-Domingue
	EC: [-78.4678, -0.1807],   // Quito
	SV: [-89.2182, 13.6929],   // San Salvador
	GD: [-61.7488, 12.0561],   // Saint-Georges
	GT: [-90.5069, 14.6349],   // Guatemala
	GY: [-58.1551, 6.8013],    // Georgetown
	HT: [-72.3074, 18.5944],   // Port-au-Prince
	HN: [-87.2068, 14.0723],   // Tegucigalpa
	JM: [-76.7936, 17.9712],   // Kingston
	MX: [-99.1332, 19.4326],   // Mexico
	NI: [-86.2362, 12.1149],   // Managua
	PA: [-79.5167, 8.9824],    // Panama
	PY: [-57.5759, -25.2637],  // Asuncion
	PE: [-77.0428, -12.0464],  // Lima
	KN: [-62.7177, 17.3026],   // Basseterre
	LC: [-60.9789, 14.0101],   // Castries
	VC: [-61.2247, 13.1587],   // Kingstown
	SR: [-55.2038, 5.852],     // Paramaribo
	TT: [-61.5179, 10.6918],   // Port of Spain
	US: [-77.0369, 38.9072],   // Washington
	UY: [-56.1645, -34.9011],  // Montevideo
	VE: [-66.9036, 10.4806],   // Caracas

	// ── Asie & Pacifique ────────────────────────────────
	AF: [69.2075, 34.5553],    // Kaboul
	BD: [90.4125, 23.8103],    // Dhaka
	BT: [89.6177, 27.4728],    // Thimphou
	BN: [114.9398, 4.9031],    // Bandar Seri Begawan
	KH: [104.9282, 11.5564],   // Phnom Penh
	CN: [116.4074, 39.9042],   // Pékin
	FJ: [178.4419, -18.1248],  // Suva
	IN: [77.209, 28.6139],     // New Delhi
	ID: [106.8456, -6.2088],   // Jakarta
	JP: [139.6917, 35.6762],   // Tokyo
	KZ: [71.4491, 51.1694],    // Astana
	KG: [74.5698, 42.8746],    // Bichkek
	LA: [102.6331, 17.9757],   // Vientiane
	MY: [101.6869, 3.139],     // Kuala Lumpur
	MV: [73.5093, 4.1755],     // Malé
	MN: [106.9057, 47.8864],   // Oulan-Bator
	MM: [96.0785, 19.7633],    // Naypyidaw
	NP: [85.324, 27.7172],     // Katmandou
	NZ: [174.7762, -41.2865],  // Wellington
	PK: [73.0479, 33.6844],    // Islamabad
	PH: [120.9842, 14.5995],   // Manille
	SG: [103.8198, 1.3521],    // Singapour
	KR: [126.978, 37.5665],    // Séoul
	LK: [79.8612, 6.9271],     // Colombo
	TW: [121.5654, 25.033],    // Taipei
	TJ: [68.7864, 38.5598],    // Douchanbé
	TH: [100.5018, 13.7563],   // Bangkok
	TL: [125.5603, -8.5569],   // Dili
	TM: [58.3776, 37.9601],    // Achgabat
	UZ: [69.2401, 41.2995],    // Tachkent
	VN: [105.8342, 21.0285],   // Hanoï
	AU: [149.1287, -35.2809],  // Canberra

	// ── Moyen-Orient ────────────────────────────────────
	BH: [50.5876, 26.2285],    // Manama
	IR: [51.389, 35.6892],     // Téhéran
	IQ: [44.3661, 33.3152],    // Bagdad
	IL: [35.2137, 31.7683],    // Jérusalem
	JO: [35.9106, 31.9454],    // Amman
	KW: [47.9783, 29.3759],    // Koweït City
	LB: [35.4955, 33.8886],    // Beyrouth
	OM: [58.5378, 23.588],     // Mascate
	PS: [35.2456, 31.9038],    // Ramallah
	QA: [51.5136, 25.2854],    // Doha
	SA: [46.6753, 24.7136],    // Riyad
	SY: [36.2913, 33.5138],    // Damas
	TR: [32.8597, 39.9334],    // Ankara
	AE: [54.3773, 24.4539],    // Abou Dabi
	YE: [44.191, 15.3694],     // Sanaa
};

/** Resolve capital coordinates for an ISO-2 country code. Returns null if unknown. */
export function getCapitalCoords(countryCode: string | undefined | null): [number, number] | null {
	if (!countryCode) return null;
	const upper = countryCode.toUpperCase();
	return COUNTRY_CAPITALS[upper] ?? null;
}
