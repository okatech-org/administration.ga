/* eslint-env serviceworker */
/**
 * Service Worker — Sprint 6 agent-web
 *
 * Minimal handler push + notificationclick. Ne cache rien (Next.js gère).
 *
 * Payload attendu (JSON envoyé par webpush.sendNotification) :
 *   { title: string, body: string, url?: string, icon?: string, tag?: string }
 *
 * Installé/registered côté client via `use-push-subscription.ts`.
 */

self.addEventListener("install", () => {
  // Active le SW immédiatement (pas de skipWaiting nécessaire pour push)
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Consulat.ga", body: "Notification", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    data.body = (event.data && event.data.text && event.data.text()) || data.body;
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/apple-icon-180x180.png",
    badge: "/icons/favicon-32x32.png",
    tag: data.tag || "consulat-notification",
    data: { url: data.url || "/" },
    requireInteraction:
      data.tag === "escalation_breach" || data.tag === "sla_breach",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Essaie de focus sur un client existant qui matche l'URL
      for (const client of allClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Sinon ouvre un nouvel onglet
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
