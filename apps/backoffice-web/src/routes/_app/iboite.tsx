import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import {
  Paperclip,
  Reply,
  Archive,
  Trash2,
  Send,
  Search,
  Clock,
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  avatar: string;
  subject: string;
  preview: string;
  fullContent: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "drafts" | "archive";
}

interface Conversation {
  id: string;
  title: string;
  participants: string[];
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messageCount: number;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    title: "Ambassadeur Jean Dupont",
    participants: ["Jean Dupont"],
    avatar: "JD",
    lastMessage: "Approuvé - Merci de procéder avec les démarches suivantes.",
    timestamp: "Aujourd'hui 14:30",
    unread: true,
    messageCount: 5,
  },
  {
    id: "2",
    title: "Consul Marie Ondo",
    participants: ["Marie Ondo"],
    avatar: "MO",
    lastMessage: "Les documents seront prêts demain matin.",
    timestamp: "Hier 16:45",
    unread: false,
    messageCount: 12,
  },
  {
    id: "3",
    title: "Groupe - Équipe Administrative",
    participants: ["Pierre Martin", "Sophie Ngoma", "Luc Ibinga"],
    avatar: "EA",
    lastMessage: "La réunion est confirmée pour vendredi.",
    timestamp: "Hier 11:20",
    unread: false,
    messageCount: 8,
  },
  {
    id: "4",
    title: "Attaché Pierre Martin",
    participants: ["Pierre Martin"],
    avatar: "PM",
    lastMessage: "J'ai reçu la demande de visa pour 15 candidats.",
    timestamp: "Il y a 2 jours",
    unread: false,
    messageCount: 3,
  },
  {
    id: "5",
    title: "Direction Administrative",
    participants: ["Direction Administrative"],
    avatar: "DA",
    lastMessage: "Veuillez soumettre les rapports avant le 31 mars.",
    timestamp: "Il y a 3 jours",
    unread: false,
    messageCount: 6,
  },
];

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "Ambassadeur Jean Dupont",
    avatar: "JD",
    subject: "Approuvé - Dossier Bilatéral France",
    preview: "Approuvé - Merci de procéder avec les démarches suivantes...",
    fullContent:
      "Bonjour,\n\nJ'ai examiné le dossier bilatéral avec la France. Tout est en ordre et approuvé.\n\nPourriez-vous procéder avec les démarches suivantes:\n1. Envoyer la note verbale au Ministère\n2. Programmer la réunion diplomatique\n3. Préparer le communiqué de presse\n\nCordialement,\nAmbassadeur Jean Dupont",
    timestamp: "Aujourd'hui 14:30",
    read: false,
    starred: true,
    folder: "inbox",
  },
  {
    id: "2",
    sender: "Consul Marie Ondo",
    avatar: "MO",
    subject: "Traitement des visas - Mise à jour",
    preview: "Les documents seront prêts demain matin...",
    fullContent:
      "Bonjour,\n\nÀ propos de la demande de visas:\n- 45 dossiers en cours de traitement\n- 30 documents reçus et vérifiés\n- 15 entretiens prévus cette semaine\n\nLes documents finaux seront prêts demain matin.",
    timestamp: "Hier 16:45",
    read: true,
    starred: false,
    folder: "inbox",
  },
  {
    id: "3",
    sender: "Direction Administrative",
    avatar: "DA",
    subject: "Rappel - Rapports Trimestriels",
    preview: "Veuillez soumettre les rapports avant le 31 mars...",
    fullContent:
      "Rappel important: Tous les rapports trimestriels doivent être soumis avant le 31 mars 2026.\n\nVeuillez inclure:\n- Statistiques d'activité\n- Ressources humaines\n- Budget utilisé\n- Recommandations",
    timestamp: "Il y a 3 jours",
    read: true,
    starred: false,
    folder: "inbox",
  },
];

export const Route = createFileRoute("/_app/iboite")({
  component: IboitePage,
});

function IboitePage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "drafts" | "archive">("inbox");
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = mockConversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvatarColor = (initials: string) => {
    const colors: Record<string, string> = {
      JD: "bg-blue-600",
      MO: "bg-purple-600",
      EA: "bg-green-600",
      PM: "bg-amber-600",
      DA: "bg-red-600",
    };
    return colors[initials] || "bg-slate-600";
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput("");
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <h1 className="text-2xl font-bold text-white">Messagerie Interne</h1>
        <p className="text-sm text-slate-400">Back-Office</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-full sm:w-80 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-slate-500"
                size={18}
              />
              <Input
                placeholder="Rechercher conversations..."
                className="pl-10 bg-slate-700 border-slate-600 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Folder Tabs */}
          <Tabs
            value={activeFolder}
            onValueChange={(value) =>
              setActiveFolder(value as "inbox" | "sent" | "drafts" | "archive")
            }
            className="px-4 pt-4"
          >
            <TabsList className="bg-slate-700 border-slate-600 w-full">
              <TabsTrigger value="inbox" className="flex-1">
                Reçus
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1">
                Envoyés
              </TabsTrigger>
              <TabsTrigger value="drafts" className="flex-1">
                Brouillons
              </TabsTrigger>
              <TabsTrigger value="archive" className="flex-1">
                Archive
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-slate-700">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? "bg-blue-600/20 border-l-2 border-blue-600"
                      : "hover:bg-slate-700/50"
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={`${getAvatarColor(conversation.avatar)} text-white font-bold`}>
                      {conversation.avatar}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`font-semibold truncate ${
                            conversation.unread
                              ? "text-white"
                              : "text-slate-300"
                          }`}
                        >
                          {conversation.title}
                        </h3>
                        <span
                          className={`text-xs flex-shrink-0 ${
                            conversation.unread
                              ? "text-blue-400 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {conversation.messageCount}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {conversation.lastMessage}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {conversation.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message View */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col hidden sm:flex">
            {/* Conversation Header */}
            <div className="border-b border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  className={`${getAvatarColor(selectedConversation.avatar)} text-white font-bold`}
                >
                  {selectedConversation.avatar}
                </Avatar>
                <div>
                  <h2 className="text-white font-semibold">
                    {selectedConversation.title}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {selectedConversation.participants.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex gap-3 group"
                >
                  <Avatar className={`${getAvatarColor(msg.avatar)} text-white font-bold flex-shrink-0`}>
                    {msg.avatar}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">
                        {msg.sender}
                      </h4>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        {msg.timestamp}
                      </span>
                    </div>
                    <Card className="bg-slate-700 border-slate-600 p-3 mb-2">
                      <p className="text-sm text-slate-100 whitespace-pre-wrap">
                        {msg.fullContent}
                      </p>
                    </Card>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Reply size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Archive size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="border-t border-slate-700 p-4 bg-slate-800">
              <div className="flex gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                >
                  <Paperclip size={18} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Écrivez votre message..."
                  className="bg-slate-700 border-slate-600 text-white"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center hidden sm:flex">
            <p className="text-slate-400">
              Sélectionnez une conversation pour commencer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
