import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Search,
  Trash2,
  Archive,
  Star,
  Reply,
  Send,
  ChevronRight,
  Folder,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/iboite")({
  component: IBoitePage,
});

interface Message {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder: "inbox" | "sent" | "drafts" | "archive";
}

const mockMessages: Message[] = [
  {
    id: "1",
    from: "Ambassadeur Jean Dupont",
    fromEmail: "j.dupont@embassy.ga",
    subject: "Rapport mensuel - Février 2026",
    preview: "Veuillez trouver ci-joint le rapport de nos activités...",
    body: "Veuillez trouver ci-joint le rapport de nos activités diplomatiques pour le mois de février 2026. Les relations commerciales se renforcent...",
    date: "2026-03-27",
    isRead: false,
    isStarred: false,
    folder: "inbox",
  },
  {
    id: "2",
    from: "Ministère des Affaires Étrangères",
    fromEmail: "contact@mfa.ga",
    subject: "Convocation réunion bilatérale",
    preview: "Vous êtes convoqué à une réunion le 28 mars à 10h...",
    body: "Vous êtes convoqué à une réunion bilatérale avec la délégation française le 28 mars à 10h en Salle A.",
    date: "2026-03-26",
    isRead: true,
    isStarred: true,
    folder: "inbox",
  },
  {
    id: "3",
    from: "Attaché commercial",
    fromEmail: "commerce@consulat.ga",
    subject: "Demande de visa - Dossier #2024-156",
    preview: "Suite à votre demande du 15 mars concernant...",
    body: "Suite à votre demande du 15 mars concernant la demande de visa affaires, nous vous informons que votre dossier a été approuvé.",
    date: "2026-03-25",
    isRead: true,
    isStarred: false,
    folder: "inbox",
  },
  {
    id: "4",
    from: "Moi",
    fromEmail: "user@consulat.ga",
    subject: "RE: Accord commercial",
    preview: "Merci pour votre message. Les termes proposés...",
    body: "Merci pour votre message. Les termes proposés sont acceptables. Je propose une réunion la semaine prochaine.",
    date: "2026-03-24",
    isRead: true,
    isStarred: false,
    folder: "sent",
  },
  {
    id: "5",
    from: "Secrétaire",
    fromEmail: "secretaire@consulat.ga",
    subject: "Brouillon - Lettre de créance",
    preview: "Projet de lettre de créance pour révision...",
    body: "Projet de lettre de créance pour révision avant envoi à la chancellerie.",
    date: "2026-03-23",
    isRead: true,
    isStarred: false,
    folder: "drafts",
  },
];

function IBoitePage() {
  const [currentFolder, setCurrentFolder] = useState<
    "inbox" | "sent" | "drafts" | "archive"
  >("inbox");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(
    mockMessages[0]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const folderConfig = {
    inbox: { label: "Boîte de réception", icon: Mail, count: 3 },
    sent: { label: "Envoyés", icon: Send, count: 1 },
    drafts: { label: "Brouillons", icon: Archive, count: 1 },
    archive: { label: "Archive", icon: Archive, count: 0 },
  };

  const filteredMessages = mockMessages
    .filter((msg) => msg.folder === currentFolder)
    .filter(
      (msg) =>
        msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.preview.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSendReply = () => {
    if (replyContent.trim()) {
      setReplyContent("");
      setIsReplyOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Messagerie Diplomatique
                </h1>
                <p className="text-sm text-slate-400">
                  Communications sécurisées
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Nouveau message
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-6 py-6 flex gap-6">
          {/* Sidebar - Folders */}
          <div className="w-64 flex flex-col gap-4">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Dossiers</h2>
              <div className="space-y-2">
                {(Object.entries(folderConfig) as any).map(([key, config]) => (
                  <Button
                    key={key}
                    onClick={() => setCurrentFolder(key)}
                    variant={currentFolder === key ? "default" : "ghost"}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <config.icon className="w-4 h-4" />
                      <span>{config.label}</span>
                    </div>
                    {config.count > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-300">
                        {config.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Panel - Split View */}
          <div className="flex-1 flex gap-6">
            {/* Message List */}
            <div className="w-96 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                />
              </div>

              <Card className="bg-slate-800 border-slate-700 flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="space-y-1 p-2">
                    {filteredMessages.map((msg) => (
                      <Button
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        variant={
                          selectedMessage?.id === msg.id ? "default" : "ghost"
                        }
                        className="w-full justify-start h-auto p-3 mb-1 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {msg.from}
                            </span>
                            {!msg.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-300 truncate">
                            {msg.subject}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {msg.preview}
                          </p>
                        </div>
                        {msg.isStarred && (
                          <Star className="w-4 h-4 text-yellow-400 ml-2 shrink-0" />
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Message Detail */}
            {selectedMessage && (
              <div className="flex-1 flex flex-col gap-4">
                <Card className="bg-slate-800 border-slate-700 p-6 flex flex-col flex-1">
                  {/* Message Header */}
                  <div className="border-b border-slate-700 pb-4 mb-4">
                    <h2 className="text-lg font-semibold text-white mb-3">
                      {selectedMessage.subject}
                    </h2>
                    <div className="space-y-2 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <div>
                          <p className="font-medium text-white">
                            {selectedMessage.from}
                          </p>
                          <p className="text-xs">{selectedMessage.fromEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{selectedMessage.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 mb-4">
                    <p className="text-slate-100 text-sm leading-relaxed">
                      {selectedMessage.body}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => setIsReplyOpen(!isReplyOpen)}
                      variant="outline"
                      className="border-slate-600"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Répondre
                    </Button>
                    <Button variant="ghost">
                      <Star className="w-4 h-4 mr-2" />
                      Marquer
                    </Button>
                    <Button variant="ghost">
                      <Archive className="w-4 h-4 mr-2" />
                      Archiver
                    </Button>
                    <Button variant="ghost">
                      <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                      Supprimer
                    </Button>
                  </div>
                </Card>

                {/* Reply Box */}
                {isReplyOpen && (
                  <Card className="bg-slate-800 border-slate-700 p-4">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Écrivez votre réponse..."
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 mb-3 min-h-24"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendReply}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </Button>
                      <Button
                        onClick={() => setIsReplyOpen(false)}
                        variant="outline"
                        className="border-slate-600"
                      >
                        Annuler
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
