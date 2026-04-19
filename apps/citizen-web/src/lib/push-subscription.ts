/**
 * Web Push subscription helpers — shared between citizen settings opt-in and
 * any future feature that wants to trigger subscription flow.
 *
 * Flow :
 *   1. Register /sw-push.js (scope: /).
 *   2. Request Notification permission.
 *   3. Subscribe via PushManager with the public VAPID key from env.
 *   4. Hand the resulting subscription to the Convex mutation so the server
 *      can fan out push notifications to this endpoint.
 */

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(normalized);
	const buffer = new ArrayBuffer(raw.length);
	const view = new Uint8Array(buffer);
	for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
	return buffer;
}

export async function enablePushSubscription(
	subscribeMutation: (args: {
		endpoint: string;
		keys: { p256dh: string; auth: string };
		userAgent?: string;
	}) => Promise<unknown>,
): Promise<
	| { ok: true }
	| { ok: false; reason: "unsupported" | "denied" | "no_vapid" | "error"; error?: unknown }
> {
	if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
	if (!("serviceWorker" in navigator) || !("PushManager" in window))
		return { ok: false, reason: "unsupported" };

	const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	if (!vapidPublicKey) return { ok: false, reason: "no_vapid" };

	try {
		const registration = await navigator.serviceWorker.register("/sw-push.js", {
			scope: "/",
		});
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return { ok: false, reason: "denied" };

		const existing = await registration.pushManager.getSubscription();
		const subscription =
			existing ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
			}));

		const json = subscription.toJSON() as {
			endpoint?: string;
			keys?: { p256dh?: string; auth?: string };
		};
		if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
			return { ok: false, reason: "error" };

		await subscribeMutation({
			endpoint: json.endpoint,
			keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
			userAgent: navigator.userAgent,
		});
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: "error", error };
	}
}

export async function disablePushSubscription(
	unsubscribeMutation: (args: { endpoint: string }) => Promise<unknown>,
): Promise<{ ok: boolean }> {
	if (typeof window === "undefined") return { ok: false };
	if (!("serviceWorker" in navigator)) return { ok: false };
	try {
		const registration = await navigator.serviceWorker.getRegistration("/");
		const subscription = await registration?.pushManager.getSubscription();
		if (subscription) {
			try {
				await unsubscribeMutation({ endpoint: subscription.endpoint });
			} catch (_) {
				// server-side best-effort; still unsub locally
			}
			await subscription.unsubscribe();
		}
		return { ok: true };
	} catch (_) {
		return { ok: false };
	}
}
