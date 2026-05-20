/**
 * captureCameraAsBase64 — Capture une frame depuis la caméra du device.
 *
 * Sprint 6.5 — C3 (Ronde 3) : utilisé par le câblage client du tool
 * `analyze_camera`. Approche native `getUserMedia({ video: true })` — pas
 * de dépendance externe. Le navigateur affiche le popup de permission
 * caméra natif si pas déjà accordé.
 *
 * Flux :
 *   1. `getUserMedia({ video: { facingMode: 'environment' } })` → privilégie
 *      la caméra arrière (utile pour scanner passeport, document) ; fallback
 *      sur la caméra par défaut si pas dispo.
 *   2. Délai de 800 ms pour l'auto-focus matériel (sinon snap flou).
 *   3. Une `VideoElement` rend la frame courante.
 *   4. Canvas écrit cette frame puis `.toDataURL("image/jpeg", 0.85)` —
 *      JPEG pour réduire la taille (photo vs UI screenshot du C1 qui est PNG).
 *   5. Stream arrêté immédiatement.
 *
 * Retour :
 *   - `string` : data URL JPEG base64
 *   - `null` : permission refusée OU API non supportée
 */
export async function captureCameraAsBase64(): Promise<string | null> {
	if (typeof navigator === "undefined" || !navigator.mediaDevices) return null;
	if (typeof navigator.mediaDevices.getUserMedia !== "function") return null;

	let stream: MediaStream | null = null;
	try {
		// Tente d'abord la caméra arrière (typique pour scanner un doc).
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { ideal: "environment" },
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
				audio: false,
			});
		} catch {
			// Fallback sur la caméra par défaut (utile en desktop sans rear cam).
			stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
		}
	} catch {
		return null; // Permission refusée ou pas de caméra.
	}

	try {
		const video = document.createElement("video");
		video.muted = true;
		video.playsInline = true;
		video.srcObject = stream;
		await video.play();
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
		// Auto-focus matériel + exposition automatique prennent ~500-800 ms.
		await new Promise<void>((resolve) => setTimeout(resolve, 800));
		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		// JPEG quality 0.85 — bon compromis taille/fidélité pour la vision API.
		return canvas.toDataURL("image/jpeg", 0.85);
	} catch {
		return null;
	} finally {
		stream.getTracks().forEach((t) => t.stop());
	}
}
