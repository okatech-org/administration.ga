/**
 * Voice Chat Components
 * - VoiceButton: mic button in header to toggle voice mode
 * - VoiceChatContent: replaces chat content when voice is active
 */
import {
  AlertTriangle,
  Check,
  Loader2,
  Mic,
  MicOff,
  Phone,
  X as XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingConfirmation } from "./useVoiceChat";

// Main voice orb with animations
function VoiceOrb({ state }: { state: string }) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isConnecting = state === "connecting";
  const isError = state === "error";

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute h-24 w-24 rounded-full bg-green-500"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.2 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              className="absolute h-24 w-24 rounded-full bg-green-500"
            />
          </>
        )}
        {isSpeaking && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="absolute h-24 w-24 rounded-full bg-purple-500"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.2 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              className="absolute h-24 w-24 rounded-full bg-purple-500"
            />
          </>
        )}
      </AnimatePresence>

      {/* Main orb */}
      <motion.div
        animate={
          isSpeaking ? { scale: [1, 1.15, 1, 1.1, 1] }
          : isListening ?
            { scale: [1, 1.08, 1] }
          : {}
        }
        transition={{
          duration: isSpeaking ? 0.6 : 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={cn(
          "relative flex h-24 w-24 items-center justify-center rounded-full",
          isListening && "bg-green-500/20 ring-4 ring-green-500",
          isSpeaking && "bg-purple-500/20 ring-4 ring-purple-500",
          isConnecting && "bg-blue-500/20 ring-4 ring-blue-500",
          isError && "bg-red-500/20 ring-4 ring-red-500",
          !isListening &&
            !isSpeaking &&
            !isConnecting &&
            !isError &&
            "bg-muted ring-4 ring-muted-foreground",
        )}
      >
        {isSpeaking ?
          <SoundWaves />
        : isError ?
          <MicOff className="h-10 w-10 text-red-500" />
        : <motion.div
            animate={isConnecting ? { rotate: 360 } : {}}
            transition={
              isConnecting ?
                { duration: 2, repeat: Infinity, ease: "linear" }
              : {}
            }
          >
            <Mic
              className={cn(
                "h-10 w-10",
                isListening && "text-green-500",
                isConnecting && "text-blue-500",
                !isListening && !isConnecting && "text-muted-foreground",
              )}
            />
          </motion.div>
        }
      </motion.div>
    </div>
  );
}

// Sound wave animation for speaking state
function SoundWaves() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
          className="h-8 w-1.5 rounded-full bg-purple-500"
        />
      ))}
    </div>
  );
}

// Full voice chat content - replaces the welcome screen
// Props passed from parent to share the same voice state
interface VoiceChatContentProps {
  state: string;
  error: string | null;
  onClose: () => void;
  pendingConfirmation: PendingConfirmation | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

export function VoiceChatContent({
  state,
  error,
  onClose,
  pendingConfirmation,
  isConfirming,
  onConfirm,
  onReject,
}: VoiceChatContentProps) {
  const getStatusMessage = () => {
    if (pendingConfirmation) return "Confirmation requise";
    switch (state) {
      case "connecting":
        return "Connexion en cours...";
      case "listening":
        return "Je vous écoute...";
      case "processing":
        return "Je réfléchis...";
      case "speaking":
        return "Je parle...";
      case "error":
        return error || "Erreur de connexion";
      default:
        return "Mode vocal actif";
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      {/* Voice Orb */}
      {!pendingConfirmation && <VoiceOrb state={state} />}

      {/* Confirmation Card */}
      <AnimatePresence>
        {pendingConfirmation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-full max-w-xs rounded-xl border-2 border-amber-500/50 bg-amber-500/5 p-5 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                Confirmation requise
              </span>
            </div>
            <p className="text-sm text-foreground mb-4 text-left">
              {pendingConfirmation.description}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReject}
                disabled={isConfirming}
                className="flex-1 gap-1.5"
              >
                <XIcon className="h-3.5 w-3.5" />
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onConfirm}
                disabled={isConfirming}
                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {isConfirming ?
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Check className="h-3.5 w-3.5" />}
                Confirmer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <motion.p
        key={pendingConfirmation ? "confirm" : state}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mt-6 text-lg font-medium",
          pendingConfirmation && "text-amber-500",
          !pendingConfirmation && state === "error" && "text-red-500",
          !pendingConfirmation && state === "listening" && "text-green-500",
          !pendingConfirmation && state === "speaking" && "text-purple-500",
        )}
      >
        {getStatusMessage()}
      </motion.p>

      {!pendingConfirmation && (
        <p className="mt-2 text-sm text-muted-foreground">
          Parlez naturellement, je vous écoute
        </p>
      )}

      {/* End button */}
      <Button
        type="button"
        variant="destructive"
        onClick={onClose}
        className="mt-8 gap-2 rounded-full px-6"
      >
        <Phone className="h-4 w-4 rotate-[135deg]" />
        Terminer
      </Button>
    </div>
  );
}

// Header button to toggle voice mode - accepts props from parent for state sharing
interface VoiceButtonControlledProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function VoiceButton({
  isOpen,
  onClick,
  className,
}: VoiceButtonControlledProps) {
  return (
    <Button
      type="button"
      variant={isOpen ? "default" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      title="Mode vocal"
      className={cn(
        "relative",
        isOpen && "bg-green-500 hover:bg-green-600 text-white",
        className,
      )}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}

// Legacy export for compatibility
export function VoiceInputArea() {
  return null; // No longer used - VoiceChatContent replaces this
}
