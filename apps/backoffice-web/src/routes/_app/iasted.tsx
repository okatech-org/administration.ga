import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Video,
  Mic,
  MicOff,
  Send,
  Clock,
  X,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const Route = createFileRoute("/_app/iasted")({
  component: IastedPage,
});

function IastedPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Bonjour! Je suis l'Assistant IA diplomatique. Je suis ici pour vous aider avec la gestion des services consulaires, les protocoles diplomatiques, et les opérations administratives. Comment puis-je vous assister aujourd'hui?",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isCallActive]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const responses = [
        "J'ai bien noté votre demande. Comment puis-je vous aider davantage?",
        "Merci pour cette question. Voici les informations demandées sur les procédures consulaires.",
        "Je comprends votre besoin. Les ambassades gabonaises sont opérationnelles dans 25 pays.",
        "Concernant les services diplomatiques, je peux vous fournir les détails nécessaires.",
      ];

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  const startCall = (type: "audio" | "video") => {
    setIsCallActive(true);
    setCallType(type);
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallType(null);
    setIsMuted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Assistant IA</h1>
          <p className="text-sm text-slate-400">
            Administration Diplomatique
          </p>
        </div>

        {/* Call Interface */}
        {isCallActive && (
          <Card className="m-4 p-6 bg-slate-800 border-slate-700">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">
                  Appel {callType === "video" ? "Vidéo" : "Audio"}
                </h3>
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Clock size={18} />
                  <span className="text-lg font-mono">
                    {formatTime(callDuration)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant={isMuted ? "destructive" : "secondary"}
                  onClick={() => setIsMuted(!isMuted)}
                  className="gap-2"
                >
                  {isMuted ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
                  {isMuted ? "Désactiver" : "Actif"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={endCall}
                  className="gap-2"
                >
                  <X size={18} />
                  Terminer
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Chat Area */}
        {!isCallActive && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-100"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.role === "user"
                            ? "text-blue-200"
                            : "text-slate-500"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-slate-700 p-4 bg-slate-800">
              <div className="flex gap-3 mb-4">
                <Button
                  onClick={() => startCall("audio")}
                  variant="secondary"
                  className="gap-2 flex-1"
                >
                  <Phone size={18} />
                  Appel Audio
                </Button>
                <Button
                  onClick={() => startCall("video")}
                  variant="secondary"
                  className="gap-2 flex-1"
                >
                  <Video size={18} />
                  Appel Vidéo
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleSendMessage}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
