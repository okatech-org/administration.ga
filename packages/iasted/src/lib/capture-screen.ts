/**
 * captureScreenAsBase64 — capture l'écran ou la fenêtre courante en base64 PNG.
 *
 * Sprint 6 — C1 (Ronde 3) : utilisé par le câblage client du tool
 * `capture_screen_region`. Approche native `getDisplayMedia()` — pas de
 * dépendance externe (html2canvas, dom-to-image, etc.). Le navigateur
 * affiche le popup de sélection natif (écran entier / fenêtre / onglet).
 *
 * Flux :
 *   1. `navigator.mediaDevices.getDisplayMedia({ video: true })` → MediaStream
 *   2. Une `VideoElement` rend la 1ʳᵉ frame du stream
 *   3. Un Canvas écrit cette frame puis `.toDataURL("image/png")`
 *   4. Le stream est immédiatement arrêté (pas de capture continue)
 *
 * Retour :
 *   - `string` : data URL base64 PNG complète (`data:image/png;base64,...`)
 *   - `null` : utilisateur a annulé le popup OU API non supportée
 *
 * Compatibilité : Chrome/Edge/Firefox modernes. Safari ≥ 13 (avec quirks).
 * Ne marche pas en iframe sans `allow="display-capture"`.
 */
export async function captureScreenAsBase64(): Promise<string | null> {
	if (typeof navigator === "undefined" || !navigator.mediaDevices) return null;
	const mediaDevices = navigator.mediaDevices as MediaDevices & {
		getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
	};
	if (typeof mediaDevices.getDisplayMedia !== "function") return null;

	let stream: MediaStream | null = null;
	try {
		stream = await mediaDevices.getDisplayMedia({
			video: { frameRate: 1 } as MediaTrackConstraints,
			audio: false,
		});
	} catch {
		// Utilisateur a annulé le popup ou permission refusée.
		return null;
	}

	try {
		const video = document.createElement("video");
		video.muted = true;
		video.playsInline = true;
		video.srcObject = stream;
		await video.play();
		// Attendre que la frame soit disponible (largeur > 0).
		await new Promise<void>((resolve) => {
			if (video.videoWidth > 0) {
				resolve();
				return;
			}
			const onLoaded = () => {
				video.removeEventListener("loadedmetadata", onLoaded);
				resolve();
			};
			video.addEventListener("loadedmetadata", onLoaded);
		});
		// Petit délai pour s'assurer que la 1ʳᵉ frame est rendue.
		await new Promise<void>((resolve) => setTimeout(resolve, 100));
		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		// PNG préserve mieux le texte que JPEG (mais plus lourd). Compromis
		// pour les UI où la lisibilité du texte fin compte.
		const dataUrl = canvas.toDataURL("image/png");
		return dataUrl;
	} catch {
		return null;
	} finally {
		// Toujours arrêter les pistes pour éliminer l'indicateur de partage
		// du navigateur (typiquement une bannière en haut de page).
		stream.getTracks().forEach((t) => t.stop());
	}
}
