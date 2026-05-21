"use client";

/**
 * usePushSubscription — Sprint 6
 *
 * Hook d'abonnement Web Push pour l'agent-web.
 *
 * Flow :
 *  1. Vérifie support navigateur (PushManager + ServiceWorker).
 *  2. Si permission 'default', demande via Notification.requestPermission().
 *  3. Register SW `/sw.js`.
 *  4. pushManager.subscribe avec applicationServerKey = VAPID_PUBLIC_KEY.
 *  5. POST vers Convex `api.functions.pushSubscriptions.subscribe`.
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { FEATURES } from "@/lib/feature-flags";

type Permission = "granted" | "denied" | "default" | "unsupported";

export interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: Permission;
  loading: boolean;
  error: string | null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Url);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushSubscription() {
  const subscribe = useMutation(
    api.functions.pushSubscriptions.subscribe,
  );
  const unsubscribe = useMutation(
    api.functions.pushSubscriptions.unsubscribe,
  );

  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: "default",
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (typeof window === "undefined") return;
      const isSupported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: "unsupported",
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) {
          setState({
            isSupported: true,
            isSubscribed: !!sub,
            permission: (Notification.permission as Permission) ?? "default",
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            isSupported: true,
            isSubscribed: false,
            permission: "default",
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!state.isSupported) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setState((s) => ({
        ...s,
        error: "VAPID public key missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY)",
      }));
      return;
    }
    if (!FEATURES.push) {
      setState((s) => ({ ...s, error: "Feature push désactivée" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({
          ...s,
          permission: permission as Permission,
          loading: false,
        }));
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const json = sub.toJSON();
      const keys = json.keys as
        | { p256dh: string; auth: string }
        | undefined;
      if (!keys) throw new Error("Push keys missing");

      await subscribe({
        endpoint: sub.endpoint,
        keys,
        userAgent: navigator.userAgent,
      });

      setState({
        isSupported: true,
        isSubscribed: true,
        permission: "granted",
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [state.isSupported, subscribe]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await unsubscribe({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState((s) => ({
        ...s,
        isSubscribed: false,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [unsubscribe]);

  return { ...state, enable, disable };
}
