/**
 * Entretien employeur ↔ candidat via LiveKit (Polish E).
 *
 * URL : /employeur/entretiens/{candidatureId}
 * Récupère un token LiveKit dédié à cette candidature et affiche la room
 * avec VideoConference (composant @livekit/components-react).
 */
"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { LIVEKIT_CALL_ROOM_OPTIONS } from "@workspace/livekit/room-options";
import { useLiveKitDisconnectGuard } from "@workspace/livekit/use-livekit-disconnect-guard";
import { toast } from "sonner";
import { Video } from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

export default function EntretienVisioPage({
  params,
}: {
  params: { candidatureId: string };
}) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const { onConnected, onDisconnected, markUserHangUp } =
    useLiveKitDisconnectGuard(() => {
      setConnected(false);
      setToken(null);
    });

  // @ts-expect-error — api.pnpe typé après codegen
  const requestToken = useAction(api.actions?.pnpeLivekit?.getEntretienToken);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await requestToken({
          candidatureId: params.candidatureId as never,
        });
        if (!cancelled) {
          setToken(res.token);
          setWsUrl(res.wsUrl);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error
              ? `Token LiveKit indisponible : ${e.message}`
              : "Token LiveKit indisponible",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.candidatureId, requestToken]);

  const handleHangUp = () => {
    markUserHangUp();
    setConnected(false);
    setToken(null);
  };

  if (!token || !wsUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <Video className="size-12 text-muted-foreground/40 mb-4 animate-pulse" />
        <p className="text-sm text-muted-foreground">
          Préparation de la salle d'entretien…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">
            Entretien visio
          </h1>
          <p className="text-xs text-muted-foreground">
            Candidature {params.candidatureId.slice(-6)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleHangUp}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Raccrocher
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden border"
        style={{ height: "70vh" }}
      >
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          options={LIVEKIT_CALL_ROOM_OPTIONS}
          onConnected={() => {
            onConnected();
            setConnected(true);
          }}
          onDisconnected={() => onDisconnected()}
          connect={true}
          audio
          video
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>

      {!connected && (
        <p className="text-xs text-muted-foreground text-center">
          Connexion à la salle d'entretien…
        </p>
      )}
    </div>
  );
}
