/**
 * Web Push service worker — Consulat.ga citizen-web
 *
 * Handles `push` events from the server and displays a notification.
 * Clicking the notification opens the URL carried in the payload.
 *
 * This SW is registered on demand when the user opts into push notifications
 * from /my-space/settings?tab=notifications. It does NOT cache assets or
 * intercept fetches — it is push-only.
 */

self.addEventListener("install", (event) => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
	let payload = { title: "Consulat.ga", body: "Nouvelle notification" };
	try {
		if (event.data) {
			payload = { ...payload, ...event.data.json() };
		}
	} catch (_) {
		// non-JSON — keep defaults
	}

	const title = payload.title || "Consulat.ga";
	const options = {
		body: payload.body || "",
		icon: payload.icon || "/icons/icon-192.png",
		badge: "/icons/badge-72.png",
		tag: payload.tag,
		data: { url: payload.url || "/my-space" },
		renotify: !!payload.tag,
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = (event.notification.data && event.notification.data.url) || "/my-space";
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((windows) => {
				for (const win of windows) {
					if ("focus" in win) {
						win.navigate ? win.navigate(url) : null;
						return win.focus();
					}
				}
				return self.clients.openWindow(url);
			}),
	);
});
