import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  List,
  Grid,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_app/iagenda")({
  component: IAgendaPage,
});

interface Event {
  id: string;
  title: string;
  type:
    | "reunion_diplomatique"
    | "conference"
    | "ceremonie"
    | "audience"
    | "visite_officielle"
    | "reception"
    | "formation"
    | "conseil";
  date: string;
  time: string;
  location: string;
  attendees: string[];
  description: string;
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Réunion bilatérale avec l'ambassadeur français",
    type: "reunion_diplomatique",
    date: "2026-03-28",
    time: "10:00",
    location: "Salle de conférence A",
    attendees: ["Ambassadeur", "Ministre", "Attaché diplomatique"],
    description: "Discussion sur les relations commerciales",
  },
  {
    id: "2",
    title: "Conférence de presse - Accords commerciaux",
    type: "conference",
    date: "2026-03-29",
    time: "14:00",
    location: "Auditorium principal",
    attendees: ["Presse", "Ministères", "Organisations",  "Citoyens"],
    description:
      "Présentation des nouveaux accords commerciaux signés cette semaine",
  },
  {
    id: "3",
    title: "Cérémonie de remise de décoration",
    type: "ceremonie",
    date: "2026-03-30",
    time: "15:30",
    location: "Palais présidentiel",
    attendees: ["Ministres", "Diplomates", "Personnalités"],
    description: "Remise de la Légion d'honneur à 5 personnalités",
  },
  {
    id: "4",
    title: "Audience avec délégation gouvernementale",
    type: "audience",
    date: "2026-04-01",
    time: "11:00",
    location: "Bureau ministériel",
    attendees: ["Ministre", "Délégation", "Conseillers"],
    description: "Audience officielle de la délégation du gouvernement",
  },
  {
    id: "5",
    title: "Visite officielle au Congo-Brazzaville",
    type: "visite_officielle",
    date: "2026-04-05",
    time: "08:00",
    location: "Aéroport international",
    attendees: ["Ministre", "Escorte diplomatique", "Autorités congolaises"],
    description: "Visite officielle de 3 jours pour renforcer les relations",
  },
  {
    id: "6",
    title: "Réception diplomatique - Jour du continent africain",
    type: "reception",
    date: "2026-04-02",
    time: "18:00",
    location: "Centre culturel",
    attendees: ["Diplomates", "Personnalités", "Citoyens invités"],
    description: "Célébration de la journée du continent africain",
  },
];

const EventTypeConfig = {
  reunion_diplomatique: { color: "bg-blue-500/20 text-blue-300", label: "Réunion diplomatique" },
  conference: { color: "bg-purple-500/20 text-purple-300", label: "Conférence" },
  ceremonie: { color: "bg-red-500/20 text-red-300", label: "Cérémonie" },
  audience: { color: "bg-green-500/20 text-green-300", label: "Audience" },
  visite_officielle: { color: "bg-orange-500/20 text-orange-300", label: "Visite officielle" },
  reception: { color: "bg-pink-500/20 text-pink-300", label: "Réception" },
  formation: { color: "bg-indigo-500/20 text-indigo-300", label: "Formation" },
  conseil: { color: "bg-cyan-500/20 text-cyan-300", label: "Conseil" },
};

function IAgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 28));
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockEvents.filter((event) => event.date === dateStr);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Agenda Diplomatique
                </h1>
                <p className="text-sm text-slate-400">
                  Planification des événements
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel événement
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-6 py-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
              <TabsList className="bg-slate-800 border border-slate-700">
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Grid className="w-4 h-4" />
                  Calendrier
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Liste
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Calendar View */}
            <TabsContent value="calendar" className="mt-0">
              <Card className="bg-slate-800 border-slate-700 p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white capitalize">
                    {monthName}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrevMonth}
                      variant="outline"
                      size="icon"
                      className="border-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleNextMonth}
                      variant="outline"
                      size="icon"
                      className="border-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="space-y-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-slate-400 py-2"
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, idx) => {
                      const eventsForDay = day ? getEventsForDate(day) : [];
                      const isToday =
                        day &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === currentDate.getMonth() &&
                        new Date().getFullYear() === currentDate.getFullYear();

                      return (
                        <div
                          key={idx}
                          className={`min-h-24 p-2 rounded border transition ${
                            day
                              ? isToday
                                ? "bg-blue-900/30 border-blue-500/50"
                                : "bg-slate-700/30 border-slate-700 hover:border-slate-600"
                              : "bg-transparent"
                          }`}
                        >
                          {day && (
                            <div>
                              <p
                                className={`text-sm font-semibold mb-1 ${
                                  isToday ? "text-blue-300" : "text-slate-300"
                                }`}
                              >
                                {day}
                              </p>
                              <div className="space-y-1">
                                {eventsForDay.slice(0, 2).map((event) => (
                                  <div
                                    key={event.id}
                                    className="text-xs bg-slate-600/50 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-slate-600 transition"
                                    title={event.title}
                                  >
                                    {event.title}
                                  </div>
                                ))}
                                {eventsForDay.length > 2 && (
                                  <div className="text-xs text-slate-400 px-1">
                                    +{eventsForDay.length - 2} plus
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="mt-0">
              <Card className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col max-h-[calc(100vh-250px)]">
                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-6">
                    {mockEvents.map((event) => {
                      const config = EventTypeConfig[event.type];
                      return (
                        <Card
                          key={event.id}
                          className="bg-slate-700/50 border-slate-600 hover:border-slate-500 transition cursor-pointer p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-white text-sm mb-1">
                                {event.title}
                              </h3>
                              <div className="flex flex-wrap gap-2 items-center">
                                <Badge className={config.color}>
                                  {config.label}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {event.date} à {event.time}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 mb-3">
                            {event.description}
                          </p>

                          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <span>{event.attendees.length} participants</span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
