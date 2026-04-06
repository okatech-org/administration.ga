/**
 * Voice Chat Hook
 * Manages real-time voice communication with Gemini Live API
 */

import { useRouter } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAuthenticatedConvexQuery,
  useConvexActionQuery,
} from "@/integrations/convex/hooks";
import { useFormFill } from "./FormFillContext";
import { useTranslation } from "react-i18next";

import { tools as voiceTools, MUTATIVE_TOOLS } from "@convex/ai/tools";

// Pending confirmation for mutative tool calls
export type PendingConfirmation = {
  toolName: string;
  toolArgs: Record<string, unknown>;
  callId: string;
  description: string;
};

// French descriptions for mutative tools
const TOOL_DESCRIPTIONS: Record<
  string,
  (args: Record<string, unknown>) => string
> = {
  updateProfile: (a) =>
    `Mettre à jour votre profil: ${Object.keys(a).join(", ")}`,
  createRequest: (a) => `Créer une demande pour le service "${a.serviceSlug}"`,
  cancelRequest: (a) => `Annuler la demande ${a.requestId}`,
  markNotificationRead: () => "Marquer la notification comme lue",
  markAllNotificationsRead: () => "Marquer toutes les notifications comme lues",
  sendMail: (a) => `Envoyer un courrier: ${a.subject}`,
  markMailRead: () => "Marquer ce courrier comme lu",
  createAssociation: (a) => `Créer l'association "${a.name}"`,
  createCompany: (a) => `Créer l'entreprise "${a.name}"`,
  respondToAssociationInvite: (a) =>
    `${a.accept ? "Accepter" : "Refuser"} l'invitation à l'association`,
  updateCV: (a) => `Mettre à jour votre CV: ${Object.keys(a).join(", ")}`,
  addCVExperience: (a) => `Ajouter l'expérience "${a.title}" chez ${a.company}`,
  addCVEducation: (a) => `Ajouter la formation "${a.degree}" à ${a.school}`,
  addCVSkill: (a) => `Ajouter la compétence "${a.name}"`,
  addCVLanguage: (a) => `Ajouter la langue "${a.name}" (${a.level})`,
  improveCVSummary: () => "Améliorer le résumé de votre CV avec l'IA",
  suggestCVSkills: () => "Suggérer des compétences pour votre CV",
  optimizeCV: (a) => `Optimiser votre CV pour: ${a.jobDescription}`,
  generateCoverLetter: (a) =>
    `Générer une lettre de motivation pour: ${a.jobDescription}`,
  getCVATSScore: () => "Analyser la compatibilité ATS de votre CV",
};

type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface UseVoiceChatReturn {
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
}

export function useVoiceChat(): UseVoiceChatReturn {
  const { i18n } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Check browser support on mount (client-side only)
  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices &&
      "AudioContext" in window;
    setIsSupported(supported);
  }, []);

  // Refs to hold mutable state without re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Get voice config from backend
  const { mutateAsync: getVoiceConfig } = useConvexActionQuery(
    api.ai.voice.getVoiceConfig,
  );
  const { data: isVoiceAvailable } = useAuthenticatedConvexQuery(
    api.ai.voice.isVoiceAvailable,
    {},
  );

  // Convex client for executing tool calls
  const convex = useConvex();
  const router = useRouter();
  const { setFormFill } = useFormFill();

  // UI tools that are handled client-side (not sent to backend)
  const UI_TOOLS = ["navigateTo", "fillForm", "endVoiceSession"];

  // Ref to closeOverlay for use in WebSocket handler
  const closeOverlayRef = useRef<(() => void) | null>(null);
  const pendingCloseRef = useRef(false);

  // Execute UI tool client-side (navigation, form fill)
  const executeUITool = useCallback(
    (
      toolName: string,
      toolArgs: Record<string, unknown>,
    ): { success: boolean; message: string } => {
      if (toolName === "navigateTo") {
        const route = toolArgs.route as string;
        if (route) {
          router.navigate({ to: route });
          return { success: true, message: `Navigation vers ${route}` };
        }
        return { success: false, message: "Route manquante" };
      }
      if (toolName === "fillForm") {
        const formId = toolArgs.formId as string;
        const fields = toolArgs.fields as Record<string, unknown>;
        const navigateFirst = toolArgs.navigateFirst as boolean;

        if (navigateFirst) {
          const routeMap: Record<string, string> = {
            profile: "/profile",
            "profile.identity": "/profile",
            "profile.addresses": "/profile",
            "profile.contacts": "/profile",
            "profile.family": "/profile",
            request: "/requests",
          };
          const route = routeMap[formId] || "/profile";
          router.navigate({ to: route });
        }

        setFormFill({
          formId,
          fields,
          timestamp: Date.now(),
        });
        return { success: true, message: `Formulaire ${formId} pré-rempli` };
      }
      if (toolName === "endVoiceSession") {
        // Set flag — we'll close when Gemini finishes speaking (turnComplete)
        pendingCloseRef.current = true;
        return {
          success: true,
          message: "Session vocale terminée. Au revoir !",
        };
      }
      return { success: false, message: "Outil UI inconnu" };
    },
    [router, setFormFill],
  );

  // Execute a voice tool via backend action (for data tools only)
  const executeVoiceTool = useCallback(
    async (
      toolName: string,
      toolArgs: Record<string, unknown>,
    ): Promise<unknown> => {
      // Handle UI tools client-side
      if (UI_TOOLS.includes(toolName)) {
        return executeUITool(toolName, toolArgs);
      }
      // Data tools go to backend
      const result = await convex.action(api.ai.voice.executeVoiceTool, {
        toolName,
        toolArgs,
      });
      if (!result.success) {
        throw new Error(result.error ?? "Tool execution failed");
      }
      return result.data;
    },
    [convex, executeUITool],
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

    // Create audio buffer and play
    const audioBuffer = audioContextRef.current.createBuffer(
      1, // mono
      audioData.length,
      24000, // Sample rate from Gemini
    );
    audioBuffer.copyToChannel(audioData as any, 0);

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

      // Get voice config from backend
      const config = await getVoiceConfig({ locale: i18n.language });

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      // Create processor for capturing audio
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Load AudioWorklet
      await audioContextRef.current.audioWorklet.addModule(
        "/audio-processor.js",
      );

      processorRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "audio-processor",
      );

      // Connect to Gemini Live API via WebSocket
      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initial setup message with tool declarations
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
              tools: [{ function_declarations: voiceTools }],
            },
          }),
        );

        setState("listening");
      };

      ws.onmessage = async (event) => {
        try {
          // Handle Blob data (binary) - convert to text first
          let textData: string;
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else {
            textData = event.data;
          }

          const data = JSON.parse(textData);

          // Handle setup complete
          if (data.setupComplete) {
            // Setup complete — start processing audio
            // Start sending audio
            if (processorRef.current && audioContextRef.current) {
              processorRef.current.port.onmessage = (event) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  const inputData = event.data as any;
                  // Convert float32 to int16 PCM
                  const pcm16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                    pcm16[i] = Math.max(
                      -32768,
                      Math.min(32767, inputData[i] * 32768),
                    );
                  }
                  // Send as base64
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

          // Handle server content (audio response)
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
              // If endVoiceSession was called, close now that Gemini finished speaking
              if (pendingCloseRef.current) {
                pendingCloseRef.current = false;
                // Small delay to let audio buffer drain completely
                setTimeout(() => {
                  closeOverlayRef.current?.();
                }, 1000);
              }
            }
          }

          // Handle tool calls from the model
          if (data.toolCall) {
            const { functionCalls } = data.toolCall;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                // Check if this is a mutative tool → show confirmation
                if ((MUTATIVE_TOOLS as readonly string[]).includes(call.name)) {
                  const descFn = TOOL_DESCRIPTIONS[call.name];
                  const description =
                    descFn ?
                      descFn(call.args || {})
                    : `Exécuter l'action: ${call.name}`;
                  setPendingConfirmation({
                    toolName: call.name,
                    toolArgs: call.args || {},
                    callId: call.id,
                    description,
                  });
                  // Send immediate response to keep WebSocket alive
                  // Gemini will naturally announce the confirmation to the user
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
                                  message: `Action "${description}" en attente de confirmation par l'utilisateur. Dis-lui que tu as besoin de sa confirmation via le bouton qui s'affiche à l'écran.`,
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
                  // Execute read-only/UI tool immediately
                  const result = await executeVoiceTool(
                    call.name,
                    call.args || {},
                  );
                  // Send tool response back to Gemini
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
                  console.error("[Voice] Tool execution error:", toolErr);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        tool_response: {
                          function_responses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: { error: (toolErr as Error).message },
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
          console.error("[Voice] Message parse error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[Voice] WebSocket error:", event);
        setError("Erreur de connexion au service vocal");
        setState("error");
      };

      ws.onclose = (event) => {
        if (state !== "idle") {
          setState("idle");
        }
      };
    } catch (err) {
      console.error("[Voice] Start error:", err);
      setError(
        err instanceof Error ? err.message : "Erreur de démarrage vocal",
      );
      setState("error");
    }
  }, [isSupported, getVoiceConfig, playNextAudio, state, executeVoiceTool]);

  /**
   * Stop voice chat session
   */
  const stopVoice = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    // Cleanup audio context
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

  /**
   * Toggle voice on/off
   */
  const toggleVoice = useCallback(async () => {
    if (state === "idle" || state === "error") {
      await startVoice();
    } else {
      stopVoice();
    }
  }, [state, startVoice, stopVoice]);

  /**
   * Open the voice overlay and start listening
   */
  const openOverlay = useCallback(() => {
    setIsOpen(true);
    startVoice();
  }, [startVoice]);

  /**
   * Close the overlay and stop voice
   */
  const closeOverlay = useCallback(() => {
    stopVoice();
    setIsOpen(false);
  }, [stopVoice]);

  // Keep ref in sync for use in WebSocket handler
  useEffect(() => {
    closeOverlayRef.current = closeOverlay;
  }, [closeOverlay]);

  /**
   * Confirm pending mutative tool call
   */
  const confirmPending = useCallback(async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    try {
      const result = await executeVoiceTool(
        pendingConfirmation.toolName,
        pendingConfirmation.toolArgs,
      );
      // Send result as client_content text to Gemini
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            client_content: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `[CONFIRMATION] L'utilisateur a confirmé l'action "${pendingConfirmation.toolName}". Résultat: ${JSON.stringify(result)}. Annonce-lui que c'est fait.`,
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
      console.error("[Voice] Confirmed tool execution error:", err);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            client_content: {
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `[ERREUR] L'action "${pendingConfirmation.toolName}" a échoué: ${(err as Error).message}. Explique l'erreur à l'utilisateur.`,
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

  /**
   * Reject pending mutative tool call
   */
  const rejectPending = useCallback(() => {
    if (!pendingConfirmation) return;
    // Send cancellation as client_content text to Gemini
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          client_content: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: `[ANNULATION] L'utilisateur a annulé l'action "${pendingConfirmation.toolName}". Informe-le que l'action a été annulée.`,
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

  // Cleanup on unmount
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
  };
}
