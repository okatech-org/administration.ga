/**
 * iAsted — Page plein ecran (layout WhatsApp Desktop)
 * 4 sections : iChat, iContact, iAppel, Reglages
 *
 * Migrated from agent-web/src/routes/_app/iasted.tsx
 * Sub-tab components are inlined as placeholders until full migration.
 */

import { Contact, MessageSquare, Phone, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useOrg } from "../../hooks/useOrg";
import { cn } from "../../lib/utils";

// ===============================================================
// Placeholder sub-tab components (to be replaced with full migrations)
// ===============================================================

function IAstedInstantChatTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <MessageSquare className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">iChat</h3>
        <p className="text-xs text-muted-foreground max-w-xs">Messagerie & IA — module en cours d&apos;integration.</p>
      </div>
    </div>
  );
}

function IAstedContactTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <Contact className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">iContact</h3>
        <p className="text-xs text-muted-foreground max-w-xs">Annuaire unifie — module en cours d&apos;integration.</p>
      </div>
    </div>
  );
}

function IAstedCallTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <Phone className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">iAppel</h3>
        <p className="text-xs text-muted-foreground max-w-xs">Audio, Video, iReunion — module en cours d&apos;integration.</p>
      </div>
    </div>
  );
}

function IAstedSettingsTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <Settings className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">Reglages</h3>
        <p className="text-xs text-muted-foreground max-w-xs">Parametres — module en cours d&apos;integration.</p>
      </div>
    </div>
  );
}

// ===============================================================
// SIDEBAR CONFIG
// ===============================================================

const SIDEBAR_ITEMS = [
  { id: "ichat", label: "iChat", icon: MessageSquare, description: "Messagerie & IA" },
  { id: "icontact", label: "iContact", icon: Contact, description: "Annuaire unifie" },
  { id: "icall", label: "iAppel", icon: Phone, description: "Audio, Video, iReunion" },
  { id: "settings", label: "Reglages", icon: Settings, description: "Parametres" },
] as const;

type TabId = (typeof SIDEBAR_ITEMS)[number]["id"];

// ===============================================================
// MAIN COMPONENT
// ===============================================================

export function IAstedPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ichat");
  const { orgId } = useOrg();
  const activeItem = SIDEBAR_ITEMS.find((i) => i.id === activeTab);

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-16 lg:w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-3 lg:p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="hidden lg:block min-w-0">
              <h1 className="text-sm font-bold">iAsted</h1>
              <p className="text-[10px] text-muted-foreground truncate">
                {orgId ? "Organisation" : "Conscience Numerique"}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 transition-colors text-left",
                  isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-r-2 border-emerald-500"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}>
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-emerald-500")} />
                <div className="hidden lg:block min-w-0">
                  <p className="text-xs font-medium truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 lg:px-6 py-3 flex items-center shrink-0 bg-card">
          {activeItem && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <activeItem.icon className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{activeItem.label}</h2>
                <p className="text-[10px] text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === "ichat" && <IAstedInstantChatTab />}
          {activeTab === "icontact" && <IAstedContactTab />}
          {activeTab === "icall" && <IAstedCallTab />}
          {activeTab === "settings" && <IAstedSettingsTab />}
        </div>
      </main>
    </div>
  );
}
