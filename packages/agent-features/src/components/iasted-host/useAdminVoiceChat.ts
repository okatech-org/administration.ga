/**
 * Admin Voice Chat Hook
 * Manages real-time voice communication with Gemini Live API for admin agents.
 * Mirrors useVoiceChat.tsx but uses admin tools and admin voice backend.
 */

import { useRouter } from "@workspace/routing";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAuthenticatedConvexQuery,
  useConvexActionQuery,
} from "@workspace/api/hooks";
import { useOrg } from "../../shell/org-provider";
import { api } from "@convex/_generated/api";

import { ADMIN_MUTATIVE_TOOLS } from "@convex/ai/adminTools";
import { formatPageContextForVoice } from "@workspace/iasted";
import { pageContextStore } from "../../stores/page-context-store";

export type PendingConfirmation = {
  toolName: string;
  toolArgs: Record<string, unknown>;
  callId: string;
  description: string;
};

// French descriptions for admin mutative tools
const TOOL_DESCRIPTIONS: Record<
  string,
  (args: Record<string, unknown>) => string
> = {
  updateRequestStatus: (a) =>
    `Changer le statut de la demande ${a.requestId} → ${a.status}`,
  addNoteToRequest: (a) =>
    `Ajouter une note à la demande ${a.requestId}`,
  assignRequest: (a) =>
    `Assigner la demande ${a.requestId} à l'agent ${a.agentId}`,
  manageAppointment: (a) =>
    `${a.action} le rendez-vous ${a.appointmentId}`,
};

type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface UseAdminVoiceChatReturn {
  state: VoiceState;
  error: string | null;
  isSupported: boolean;
  isAvailable: boolean;
  isOpen: boolean;
  pendingConfirmation: PendingConfirmation | null;
  isConfirming: boolean;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  toggleVoice: () => Promise<void>;
  openOverlay: () => void;
  closeOverlay: () => void;
  confirmPending: () => Promise<void>;
  rejectPending: () => void;
  /**
   * Pousse une mise à jour de contexte page au modèle en cours de session.
   * No-op si la WebSocket n'est pas ouverte. Voir l'implémentation pour
   * les détails du protocole Gemini (`clientContent` + préfixe).
   */
  updatePageContext: (text: string) => void;
}

export function useAdminVoiceChat(): UseAdminVoiceChatReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { activeOrgId } = useOrg();

  // Check browser support
  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices &&
      "AudioContext" in window;
    setIsSupported(supported);
  }, []);

  // Refs for mutable state
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Backend queries
  const { mutateAsync: getVoiceConfig } = useConvexActionQuery(
    api.ai.adminVoice.getAdminVoiceConfig,
  );
  const { data: isVoiceAvailable } = useAuthenticatedConvexQuery(
    api.ai.adminVoice.isAdminVoiceAvailable,
    {},
  );

  // Convex client for tool execution
  const convex = useConvex();
  const router = useRouter();

  const UI_TOOLS = ["navigateTo", "endVoiceSession"];

  const closeOverlayRef = useRef<(() => void) | null>(null);
  const pendingCloseRef = useRef(false);

  // Execute UI tool client-side
  const executeUITool = useCallback(
    (
      toolName: string,
      toolArgs: Record<string, unknown>,
    ): { success: boolean; message: string } => {
      if (toolName === "navigateTo") {
        const route = toolArgs.route as string;
        if (route) {
          router.push(route);
          return { success: true, message: `Navigation vers ${route}` };
        }
        return { success: false, message: "Route manquante" };
      }
      if (toolName === "endVoiceSession") {
        pendingCloseRef.current = true;
        return {
          success: true,
          message: "Session vocale terminée. Au revoir !",
        };
      }
      return { success: false, message: "Outil UI inconnu" };
    },
    [router],
  );

  // Execute tool via backend
  const executeVoiceTool = useCallback(
    async (
      toolName: string,
      toolArgs: Record<string, unknown>,
    ): Promise<unknown> => {
      if (UI_TOOLS.includes(toolName)) {
        return executeUITool(toolName, toolArgs);
      }
      if (!activeOrgId) {
        throw new Error("No active organization");
      }
      const result = await convex.action(
        api.ai.adminVoice.executeAdminVoiceTool,
        {
          toolName,
          toolArgs,
          orgId: activeOrgId,
        },
      );
      if (!result.success) {
        throw new Error(result.error ?? "Tool execution failed");
      }
      return result.data;
    },
    [convex, executeUITool, activeOrgId],
  );

  /**
   * Play audio from queue
   */
  const playNextAudio = useCallback(() => {
    if (
      isPlayingRef.current ||
      audioQueueRef.current.length === 0 ||
      !audioContextRef.current
    ) {
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift();
    if (!audioData) {
      isPlayingRef.current = false;
      return;
    }

    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      audioData.length,
      24000, // Gemini output sample rate
    );
    audioBuffer.copyToChannel(audioData as Float32Array<ArrayBuffer>, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };

    source.start();
  }, []);

  /**
   * Start voice chat session
   */
  const startVoice = useCallback(async () => {
    if (!isSupported) {
      setError("Voice not supported in this browser");
      setState("error");
      return;
    }

    try {
      setState("connecting");
      setError(null);

      if (!activeOrgId) {
        setError("Aucune organisation active");
        setState("error");
        return;
      }

      // Construit le contexte page courant à transmettre au backend
      // pour qu'il soit injecté dans le systemInstruction Gemini dès
      // l'ouverture de la session. Les mises à jour ultérieures lors de
      // la navigation passent par un message `clientContent` (cf.
      // sendPageContextUpdate plus bas).
      const initialPageContext = formatPageContextForVoice({
        page: pageContextStore.getSnapshot(),
        shell: pageContextStore.getShellSnapshot(),
      });

      const config = await getVoiceConfig({
        orgId: activeOrgId,
        app: "agent",
        pageContext: initialPageContext,
      });

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // AudioWorklet
      await audioContextRef.current.audioWorklet.addModule(
        "/audio-processor.js",
      );
      processorRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "audio-processor",
      );

      // Connect to Gemini Live API
      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Tool declarations are now resolved + permission-filtered server-side
        // (cf. api.ai.adminVoice.getAdminVoiceConfig). No more raw `adminTools`
        // template ref with __NAVIGATE_TO_PLACEHOLDER__.
        const voiceToolDecls = config.toolDeclarations ?? [];

        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${config.model}`,
              generation_config: {
                response_modalities: ["AUDIO"],
              },
              system_instruction: {
                parts: [{ text: config.config.systemInstruction }],
              },
              tools:
                voiceToolDecls.length > 0
                  ? [{ function_declarations: voiceToolDecls }]
                  : undefined,
            },
          }),
        );

        setState("listening");
      };

      ws.onmessage = async (event) => {
        try {
          let textData: string;
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else {
            textData = event.data;
          }

          const data = JSON.parse(textData);

          // Setup complete → start audio
          if (data.setupComplete) {
            if (processorRef.current && audioContextRef.current) {
              processorRef.current.port.onmessage = (event) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  const inputData = event.data as Float32Array;
                  const pcm16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                    pcm16[i] = Math.max(
                      -32768,
                      Math.min(32767, inputData[i] * 32768),
                    );
                  }
                  const bytes = new Uint8Array(pcm16.buffer);
                  let base64 = "";
                  for (let j = 0; j < bytes.length; j++) {
                    base64 += String.fromCharCode(bytes[j]);
                  }
                  base64 = btoa(base64);
                  ws.send(
                    JSON.stringify({
                      realtime_input: {
                        media_chunks: [
                          {
                            mime_type: "audio/pcm;rate=16000",
                            data: base64,
                          },
                        ],
                      },
                    }),
                  );
                }
              };

              source.connect(processorRef.current);
              processorRef.current.connect(audioContextRef.current.destination);
            }
          }

          // Audio response
          if (data.serverContent) {
            if (data.serverContent.interrupted) {
              audioQueueRef.current = [];
              setState("listening");
            } else if (data.serverContent.modelTurn?.parts) {
              setState("speaking");
              for (const part of data.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const audioData = atob(part.inlineData.data);
                  const int16Array = new Int16Array(audioData.length / 2);
                  for (let i = 0; i < int16Array.length; i++) {
                    int16Array[i] =
                      audioData.charCodeAt(i * 2) |
                      (audioData.charCodeAt(i * 2 + 1) << 8);
                  }
                  const float32Array = new Float32Array(int16Array.length);
                  for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768;
                  }
                  audioQueueRef.current.push(float32Array);
                  playNextAudio();
                }
              }
            }

            if (data.serverContent.turnComplete) {
              setState("listening");
              if (pendingCloseRef.current) {
                pendingCloseRef.current = false;
                setTimeout(() => {
                  closeOverlayRef.current?.();
                }, 1000);
              }
            }
          }

          // Tool calls
          if (data.toolCall) {
            const { functionCalls } = data.toolCall;
            if (functionCalls?.length > 0) {
              for (const call of functionCalls) {
                // Mutative → show confirmation
                if (
                  (ADMIN_MUTATIVE_TOOLS as readonly string[]).includes(
                    call.name,
                  )
                ) {
                  const descFn = TOOL_DESCRIPTIONS[call.name];
                  const description =
                    descFn
                      ? descFn(call.args || {})
                      : `Exécuter l'action: ${call.name}`;
                  setPendingConfirmation({
                    toolName: call.name,
                    toolArgs: call.args || {},
                    callId: call.id,
                    description,
                  });
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        tool_response: {
                          function_responses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: {
                                output: {
                                  status: "pending_confirmation",
                                  message: `Action "${description}" en attente de confirmation.`,
                                },
                              },
                            },
                          ],
                        },
                      }),
                    );
                  }
                  return;
                }

                try {
                  const result = await executeVoiceTool(
                    call.name,
                    call.args || {},
                  );
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        tool_response: {
                          function_responses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: { output: result },
                            },
                          ],
                        },
                      }),
                    );
                  }
                } catch (toolErr) {
                  console.error("[AdminVoice] Tool error:", toolErr);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        tool_response: {
                          function_responses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: {
                                error: (toolErr as Error).message,
                              },
                            },
                          ],
                        },
                      }),
                    );
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("[AdminVoice] Message parse error:", err);
        }
      };

      ws.onerror = () => {
        setError("Erreur de connexion au service vocal");
        setState("error");
      };

      ws.onclose = () => {
        if (state !== "idle") {
          setState("idle");
        }
      };
    } catch (err) {
      console.error("[AdminVoice] Start error:", err);
      setError(
        err instanceof Error ? err.message : "Erreur de démarrage vocal",
      );
      setState("error");
    }
  }, [isSupported, getVoiceConfig, playNextAudio, state, executeVoiceTool]);

  /**
   * Pousse une mise à jour de contexte page au modèle Gemini en cours de
   * session. Gemini Live ne supporte pas `session.update` natif pour le
   * `systemInstruction`, mais on peut injecter un message texte côté
   * « user » avec un préfixe `[CONTEXTE_PAGE_MAJ]` que le prompt système
   * apprend à interpréter comme une mise à jour silencieuse. Le modèle
   * absorbe le nouveau contexte sans le verbaliser.
   *
   * No-op si la WebSocket n'est pas ouverte (session inactive).
   */
  const updatePageContext = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!text || text.trim().length === 0) return;
    ws.send(
      JSON.stringify({
        client_content: {
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: `[CONTEXTE_PAGE_MAJ]\n${text}\n[FIN_CONTEXTE_PAGE_MAJ]`,
                },
              ],
            },
          ],
          turn_complete: false,
        },
      }),
    );
  }, []);

  const stopVoice = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setState("idle");
    setError(null);
  }, []);

  const toggleVoice = useCallback(async () => {
    if (state === "idle" || state === "error") {
      await startVoice();
    } else {
      stopVoice();
    }
  }, [state, startVoice, stopVoice]);

  const openOverlay = useCallback(() => {
    setIsOpen(true);
    startVoice();
  }, [startVoice]);

  const closeOverlay = useCallback(() => {
    stopVoice();
    setIsOpen(false);
  }, [stopVoice]);

  useEffect(() => {
    closeOverlayRef.current = closeOverlay;
  }, [closeOverlay]);

  const confirmPending = useCallback(async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    try {
      const result = await executeVoiceTool(
        pendingConfirmation.toolName,
        pendingConfirmation.toolArgs,
      );
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            client_content: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `[CONFIRMATION] L'agent a confirmé l'action "${pendingConfirmation.toolName}". Résultat: ${JSON.stringify(result)}. Annonce-lui que c'est fait.`,
                    },
                  ],
                },
              ],
              turn_complete: true,
            },
          }),
        );
      }
    } catch (err) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            client_content: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `[ERREUR] L'action "${pendingConfirmation.toolName}" a échoué: ${(err as Error).message}`,
                    },
                  ],
                },
              ],
              turn_complete: true,
            },
          }),
        );
      }
    } finally {
      setPendingConfirmation(null);
      setIsConfirming(false);
    }
  }, [pendingConfirmation, executeVoiceTool]);

  const rejectPending = useCallback(() => {
    if (!pendingConfirmation) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          client_content: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: `[ANNULATION] L'agent a annulé l'action "${pendingConfirmation.toolName}".`,
                  },
                ],
              },
            ],
            turn_complete: true,
          },
        }),
      );
    }
    setPendingConfirmation(null);
  }, [pendingConfirmation]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  return {
    state,
    error,
    isSupported,
    isAvailable: !!isVoiceAvailable?.available,
    isOpen,
    pendingConfirmation,
    isConfirming,
    startVoice,
    stopVoice,
    toggleVoice,
    openOverlay,
    closeOverlay,
    confirmPending,
    rejectPending,
    updatePageContext,
  };
}
