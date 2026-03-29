import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Sparkles,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/iasted")({
  component: IAstedPage,
});

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function IAstedPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      content:
        "Bienvenue à l'Assistant IA Diplomatique. Comment puis-je vous aider aujourd'hui?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isMicActive, setIsMicActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    setTimeout(() => {
      const assistantResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        content:
          "J'ai reçu votre message. Comment puis-je vous assister davantage?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantResponse]);
    }, 500);
  };

  const handleStartAudioCall = () => {
    setIsCallActive(!isCallActive);
    if (!isCallActive) {
      const notification: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        content: "Appel audio démarré. Vous pouvez maintenant parler.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, notification]);
    }
  };

  const handleStartVideoCall = () => {
    setIsVideoActive(!isVideoActive);
    if (!isVideoActive) {
      setIsCallActive(true);
      const notification: Message = {
        id: Date.now().toString(),
        sender: "assistant",
        content: "Appel vidéo démarré.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, notification]);
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Assistant IA Diplomatique
                </h1>
                <p className="text-sm text-slate-400">
                  Support consulaire intelligent
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              En ligne
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full px-4 py-4 flex gap-4">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 bg-slate-800 border-slate-700 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-sm px-4 py-2 rounded-lg ${
                          message.sender === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-slate-700 text-slate-100 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {message.timestamp.toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t border-slate-700 p-4 bg-slate-800/50">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder="Posez votre question..."
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Call Panel */}
          <div className="w-80 flex flex-col gap-4">
            {/* Call Status Card */}
            {isCallActive && (
              <Card className="bg-linear-to-br from-green-900/30 to-slate-900 border-green-700/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-300 font-medium">
                      Appel actif
                    </span>
                  </div>
                  <span className="text-2xl font-mono text-green-300">
                    {formatCallDuration(callDuration)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsMicActive(!isMicActive)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-600"
                  >
                    {isMicActive ? (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        Micro
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Muet
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsVideoActive(!isVideoActive)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-600"
                  >
                    {isVideoActive ? (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Caméra
                      </>
                    ) : (
                      <>
                        <VideoOff className="w-4 h-4 mr-2" />
                        Vidéo
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Video Preview */}
            {isVideoActive && (
              <Card className="bg-slate-800 border-slate-700 aspect-video flex items-center justify-center rounded-lg overflow-hidden">
                <div className="text-center text-slate-400">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Vidéo en direct</p>
                </div>
              </Card>
            )}

            {/* Call Controls */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="space-y-3">
                <Button
                  onClick={handleStartAudioCall}
                  className={`w-full ${
                    isCallActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isCallActive ? (
                    <>
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Terminer appel
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" />
                      Appel audio
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleStartVideoCall}
                  variant="outline"
                  className="w-full border-slate-600"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Appel vidéo
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <h3 className="text-xs font-semibold text-slate-300 mb-3 uppercase">
                  Informations de contact
                </h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Disponible 24/7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Support instantané</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
