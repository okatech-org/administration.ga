import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "reunion_diplomatique" | "conference" | "ceremonie" | "audience" | "visite_officielle";
  location: string;
  attendees: string[];
  description: string;
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Réunion Diplomatique - Affaires Bilatérales",
    date: "2026-03-25",
    time: "10:00",
    type: "reunion_diplomatique",
    location: "Salle de Conférence A",
    attendees: ["Ambassadeur Jean Dupont", "Consul Marie Ondo", "Attaché Pierre Martin"],
    description: "Discussion des relations bilatérales avec la France et la Belgique.",
  },
  {
    id: "2",
    title: "Conférence de Presse",
    date: "2026-03-26",
    time: "14:30",
    type: "conference",
    location: "Salle de Presse",
    attendees: ["Ambassadeur Jean Dupont", "Porte-parole du Ministère"],
    description: "Présentation des nouveaux protocoles consulaires et services diplomatiques.",
  },
  {
    id: "3",
    title: "Cérémonie Officielle - Fête Nationale",
    date: "2026-03-27",
    time: "18:00",
    type: "ceremonie",
    location: "Résidence de l'Ambassadeur",
    attendees: ["Tout le personnel diplomatique", "Invités officiels"],
    description: "Célébration de la Fête Nationale du Gabon.",
  },
  {
    id: "4",
    title: "Audience Consulaire - Réclamations",
    date: "2026-03-28",
    time: "09:00",
    type: "audience",
    location: "Bureau du Consul",
    attendees: ["Consul Pierre Martin", "Assistante Consulaire"],
    description: "Audition des réclamations et demandes des citoyens gabonais.",
  },
  {
    id: "5",
    title: "Visite Officielle - Délégation Commerciale",
    date: "2026-03-29",
    time: "11:00",
    type: "visite_officielle",
    location: "Ministère du Commerce",
    attendees: ["Ambassadeur", "Délégation Commerciale Étrangère"],
    description: "Visite de la délégation commerciale chinoise pour les négociations.",
  },
  {
    id: "6",
    title: "Réunion Administrative Mensuelle",
    date: "2026-04-01",
    time: "15:00",
    type: "reunion_diplomatique",
    location: "Salle de Réunion B",
    attendees: ["Direction Administrative", "Chefs de Département"],
    description: "Revue mensuelle des opérations administratives et budgétaires.",
  },
];

export const Route = createFileRoute("/_app/iagenda")({
  component: IagendaPage,
});

function IagendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      reunion_diplomatique: "bg-blue-500/20 text-blue-200",
      conference: "bg-purple-500/20 text-purple-200",
      ceremonie: "bg-amber-500/20 text-amber-200",
      audience: "bg-green-500/20 text-green-200",
      visite_officielle: "bg-red-500/20 text-red-200",
    };
    return colors[type] || "bg-slate-500/20 text-slate-200";
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reunion_diplomatique: "Réunion Diplomatique",
      conference: "Conférence",
      ceremonie: "Cérémonie",
      audience: "Audience",
      visite_officielle: "Visite Officielle",
    };
    return labels[type];
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `2026-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return mockEvents.filter((event) => event.date === dateStr);
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const days: (number | null)[] = Array(firstDayOfMonth).fill(null);

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Agenda</h1>
          <p className="text-slate-400">Administration Diplomatique</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700 p-6">
              {/* Month Header */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={previousMonth}
                  className="gap-2"
                >
                  <ChevronLeft size={18} />
                </Button>
                <h2 className="text-xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextMonth}
                  className="gap-2"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-slate-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const events = day ? getEventsForDate(day) : [];
                  const isCurrentDay =
                    day &&
                    day === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth();

                  return (
                    <div
                      key={index}
                      className={`min-h-24 rounded-lg border transition-colors cursor-pointer ${
                        !day
                          ? "bg-slate-700/20 border-slate-700"
                          : isCurrentDay
                            ? "bg-blue-600/20 border-blue-500"
                            : "bg-slate-700 border-slate-600 hover:bg-slate-700/70"
                      }`}
                      onClick={() => {
                        if (events.length > 0) setSelectedEvent(events[0]);
                      }}
                    >
                      {day && (
                        <div className="p-2">
                          <p
                            className={`text-sm font-semibold mb-1 ${
                              isCurrentDay
                                ? "text-blue-200"
                                : "text-slate-200"
                            }`}
                          >
                            {day}
                          </p>
                          <div className="space-y-1">
                            {events.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded ${getEventTypeColor(event.type)}`}
                              >
                                {event.title.substring(0, 20)}...
                              </div>
                            ))}
                            {events.length > 2 && (
                              <p className="text-xs text-slate-400">
                                +{events.length - 2} plus
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Événements à Venir
              </h3>
              <div className="space-y-3">
                {mockEvents.slice(0, 5).map((event) => (
                  <Card
                    key={event.id}
                    className="bg-slate-700/50 border-slate-600 p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Badge className={getEventTypeColor(event.type) + " mb-2"}>
                      {getEventTypeLabel(event.type)}
                    </Badge>
                    <h4 className="text-white text-sm font-medium mb-2 line-clamp-2">
                      {event.title}
                    </h4>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p className="flex items-center gap-1">
                        <Clock size={14} />
                        {event.date} à {event.time}
                      </p>
                      <p className="flex items-center gap-1">
                        <MapPin size={14} />
                        {event.location}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <Badge className={getEventTypeColor(selectedEvent.type)}>
                {getEventTypeLabel(selectedEvent.type)}
              </Badge>

              <div className="space-y-3 text-slate-200">
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400">Date et Heure</p>
                    <p className="font-medium">
                      {selectedEvent.date} à {selectedEvent.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400">Localisation</p>
                    <p className="font-medium">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users size={18} className="text-slate-400 mt-1" />
                  <div>
                    <p className="text-xs text-slate-400">Participants</p>
                    <ul className="text-sm space-y-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <li key={idx}>• {attendee}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-2">Description</p>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1">Modifier</Button>
                <Button variant="destructive" className="flex-1">
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
