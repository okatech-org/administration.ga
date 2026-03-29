import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageCircle,
  Phone,
  Video,
  Contact2,
  Send,
  Paperclip,
  Smile,
  Phone as PhoneIcon,
  Video as VideoIcon,
  MoreVertical,
  Plus,
  Bell,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/icom")({
  component: IComPage,
});

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  status: "online" | "away" | "offline";
  department: string;
}

interface ConversationMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "text" | "call" | "video";
}

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Ambassadeur Jean Dupont",
    title: "Ambassadeur de France",
    email: "j.dupont@embassy.ga",
    status: "online",
    department: "Chancellerie",
  },
  {
    id: "2",
    name: "Marie Legrand",
    title: "Attachée commerciale",
    email: "m.legrand@consulat.ga",
    status: "online",
    department: "Commerce",
  },
  {
    id: "3",
    name: "Pierre Moreau",
    title: "Responsable visa",
    email: "p.moreau@consulat.ga",
    status: "away",
    department: "Consulaire",
  },
  {
    id: "4",
    name: "Sophie Bernard",
    title: "Chargée de protocole",
    email: "s.bernard@consulat.ga",
    status: "offline",
    department: "Protocole",
  },
];

const mockMessages: ConversationMessage[] = [
  {
    id: "1",
    sender: "Ambassadeur Jean Dupont",
    content: "Bonjour, j'ai besoin de discuter de l'accord commercial.",
    timestamp: "09:30",
    type: "text",
  },
  {
    id: "2",
    sender: "Moi",
    content: "Bien sûr, je suis disponible maintenant.",
    timestamp: "09:35",
    type: "text",
  },
  {
    id: "3",
    sender: "Ambassadeur Jean Dupont",
    content: "Parfait, je vous appelle dans 5 minutes.",
    timestamp: "09:36",
    type: "text",
  },
];

function IComPage() {
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    mockContacts[0]
  );
  const [messageInput, setMessageInput] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState("00:00");

  const stats = [
    { label: "Messages non lus", value: "12", icon: MessageCircle },
    { label: "Appels manqués", value: "3", icon: Phone },
    { label: "Vidéoconf. en attente", value: "1", icon: Video },
    { label: "Contacts actifs", value: "8", icon: Contact2 },
  ];

  const sendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageCircle className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Communications Diplomatiques
                </h1>
                <p className="text-sm text-slate-400">
                  Messagerie, appels et vidéoconférences
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau contact
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-slate-700/50 border-slate-600 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className="text-lg font-semibold text-white">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className="w-5 h-5 text-blue-400 opacity-50" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-6 py-6 flex gap-6">
          {/* Sidebar - Contacts */}
          <div className="w-80 flex flex-col gap-4">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Contacts</h2>
                <Badge className="bg-blue-500/20 text-blue-300">
                  {mockContacts.filter((c) => c.status === "online").length}{" "}
                  actifs
                </Badge>
              </div>
              <Input
                placeholder="Rechercher un contact..."
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 mb-4"
              />
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-4">
                  {mockContacts.map((contact) => (
                    <Button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      variant={
                        selectedContact?.id === contact.id ? "default" : "ghost"
                      }
                      className="w-full justify-start text-left h-auto p-3 mb-1"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="relative">
                          <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-blue-600 rounded-full" />
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                              contact.status === "online"
                                ? "bg-green-500"
                                : contact.status === "away"
                                  ? "bg-yellow-500"
                                  : "bg-slate-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {contact.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {contact.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {contact.department}
                          </p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Main Panel */}
          <div className="flex-1 flex flex-col">
            {selectedContact && (
              <Card className="bg-slate-800 border-slate-700 flex flex-col flex-1 overflow-hidden">
                {/* Contact Header */}
                <div className="border-b border-slate-700 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-400 to-blue-600 rounded-full" />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                          selectedContact.status === "online"
                            ? "bg-green-500"
                            : selectedContact.status === "away"
                              ? "bg-yellow-500"
                              : "bg-slate-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {selectedContact.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedContact.status === "online"
                          ? "En ligne"
                          : selectedContact.status === "away"
                            ? "Absent"
                            : "Hors ligne"}
                      </p>
                    </div>
                  </div>

                  <Tabs defaultValue="messages" onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-700/50 border border-slate-600">
                      <TabsTrigger value="messages" className="text-xs">
                        <MessageCircle className="w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger value="calls" className="text-xs">
                        <PhoneIcon className="w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger value="video" className="text-xs">
                        <VideoIcon className="w-4 h-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Chat Area */}
                {activeTab === "messages" && (
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {mockMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender === "Moi"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                msg.sender === "Moi"
                                  ? "bg-blue-600 text-white rounded-br-none"
                                  : "bg-slate-700 text-slate-100 rounded-bl-none"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <span className="text-xs opacity-60 mt-1 block">
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="border-t border-slate-700 p-4 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") sendMessage();
                          }}
                          placeholder="Écrivez un message..."
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        />
                        <Button
                          onClick={sendMessage}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calls Tab */}
                {activeTab === "calls" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                        <PhoneIcon className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-300 mb-4">
                          Démarrer un appel audio
                        </p>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          Appeler maintenant
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Tab */}
                {activeTab === "video" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                        <VideoIcon className="w-8 h-8 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-300 mb-4">
                          Démarrer une vidéoconférence
                        </p>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          <VideoIcon className="w-4 h-4 mr-2" />
                          Appel vidéo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
