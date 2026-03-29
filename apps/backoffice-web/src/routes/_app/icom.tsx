import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Send,
  Search,
  Phone as PhoneIcon,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface Call {
  id: string;
  person: string;
  avatar: string;
  duration: string;
  timestamp: string;
  type: "incoming" | "outgoing" | "missed";
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: "online" | "away" | "offline";
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "Ambassadeur Jean Dupont",
    avatar: "JD",
    content: "Les documents sont prêts pour signature.",
    timestamp: "Aujourd'hui 14:30",
  },
  {
    id: "2",
    sender: "Consul Marie Ondo",
    avatar: "MO",
    content: "Réunion confirmée pour demain à 10h.",
    timestamp: "Aujourd'hui 13:45",
  },
  {
    id: "3",
    sender: "Direction Administrative",
    avatar: "DA",
    content: "Rapport mensuel transmis.",
    timestamp: "Aujourd'hui 11:20",
  },
];

const mockCalls: Call[] = [
  {
    id: "1",
    person: "Ambassadeur Jean Dupont",
    avatar: "JD",
    duration: "15 min 45 sec",
    timestamp: "Aujourd'hui 14:30",
    type: "incoming",
  },
  {
    id: "2",
    person: "Consul Marie Ondo",
    avatar: "MO",
    duration: "22 min 10 sec",
    timestamp: "Aujourd'hui 11:15",
    type: "outgoing",
  },
  {
    id: "3",
    person: "Attaché Pierre Martin",
    avatar: "PM",
    duration: "--",
    timestamp: "Hier 16:45",
    type: "missed",
  },
];

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Ambassadeur Jean Dupont",
    avatar: "JD",
    role: "Ambassadeur",
    status: "online",
  },
  {
    id: "2",
    name: "Consul Marie Ondo",
    avatar: "MO",
    role: "Consul Général",
    status: "online",
  },
  {
    id: "3",
    name: "Attaché Pierre Martin",
    avatar: "PM",
    role: "Attaché Consulaire",
    status: "away",
  },
  {
    id: "4",
    name: "Sophie Ngoma",
    avatar: "SN",
    role: "Secrétaire Administrative",
    status: "online",
  },
  {
    id: "5",
    name: "Luc Ibinga",
    avatar: "LI",
    role: "Responsable RH",
    status: "offline",
  },
];

export const Route = createFileRoute("/_app/icom")({
  component: IcomPage,
});

function IcomPage() {
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput("");
    }
  };

  const getAvatarColor = (initials: string) => {
    const colors: Record<string, string> = {
      JD: "bg-blue-600",
      MO: "bg-purple-600",
      PM: "bg-amber-600",
      DA: "bg-red-600",
      SN: "bg-green-600",
      LI: "bg-pink-600",
    };
    return colors[initials] || "bg-slate-600";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: "bg-green-500",
      away: "bg-yellow-500",
      offline: "bg-slate-500",
    };
    return colors[status] || "bg-slate-500";
  };

  const filteredContacts = mockContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Communications
          </h1>
          <p className="text-slate-400">Back-Office Diplomatique</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Messages</p>
                <p className="text-2xl font-bold text-white">23</p>
              </div>
              <MessageSquare size={24} className="text-blue-500" />
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Appels</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <PhoneIcon size={24} className="text-green-500" />
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Vidéoconférences</p>
                <p className="text-2xl font-bold text-white">8</p>
              </div>
              <Video size={24} className="text-purple-500" />
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Contacts</p>
                <p className="text-2xl font-bold text-white">
                  {mockContacts.length}
                </p>
              </div>
              <Users size={24} className="text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="bg-slate-700 border-b border-slate-600 grid w-full grid-cols-4">
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <PhoneIcon size={16} />
              <span className="hidden sm:inline">Appels</span>
            </TabsTrigger>
            <TabsTrigger value="videoconference" className="gap-2">
              <Video size={16} />
              <span className="hidden sm:inline">Vidéo</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {mockMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-3 pb-4 border-b border-slate-700 last:border-0"
                  >
                    <Avatar
                      className={`${getAvatarColor(msg.avatar)} text-white font-bold flex-shrink-0`}
                    >
                      {msg.avatar}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-white font-semibold text-sm">
                          {msg.sender}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 p-4 bg-slate-800 rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nouveau message..."
                    className="bg-slate-700 border-slate-600 text-white"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
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
            </Card>
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls">
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-700">
                {mockCalls.map((call) => (
                  <div key={call.id} className="p-4 hover:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          className={`${getAvatarColor(call.avatar)} text-white font-bold`}
                        >
                          {call.avatar}
                        </Avatar>
                        <div>
                          <h4 className="text-white font-semibold text-sm">
                            {call.person}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {call.timestamp} • {call.duration}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {call.type === "incoming" && (
                          <CheckCircle
                            size={18}
                            className="text-green-500"
                          />
                        )}
                        {call.type === "outgoing" && (
                          <CheckCircle
                            size={18}
                            className="text-blue-500"
                          />
                        )}
                        {call.type === "missed" && (
                          <CheckCircle size={18} className="text-red-500" />
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                        >
                          <Phone size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Videoconference Tab */}
          <TabsContent value="videoconference">
            <Card className="bg-slate-800 border-slate-700 p-8">
              <div className="flex flex-col items-center justify-center min-h-80 text-center">
                <Video size={48} className="text-slate-500 mb-4" />
                <h3 className="text-white font-semibold mb-2">
                  Aucune vidéoconférence active
                </h3>
                <p className="text-slate-400 mb-4">
                  Démarrez une nouvelle vidéoconférence avec vos contacts
                </p>
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Video size={18} />
                  Démarrer Vidéoconférence
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <div className="space-y-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-slate-500"
                  size={18}
                />
                <Input
                  placeholder="Rechercher contacts..."
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Card className="bg-slate-800 border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-700">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar
                            className={`${getAvatarColor(contact.avatar)} text-white font-bold`}
                          >
                            {contact.avatar}
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${getStatusColor(contact.status)}`}
                          />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">
                            {contact.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {contact.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                        >
                          <Phone size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                        >
                          <Video size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                        >
                          <MessageSquare size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
