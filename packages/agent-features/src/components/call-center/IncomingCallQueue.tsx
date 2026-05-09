"use client";

import { Loader2, Phone, PhoneIncoming, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "@convex/_generated/dataModel";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import type { ActiveCallSlot } from "./ActiveCallsBar";
import { CallCard, type CallCardData } from "./CallCard";
import type { RecentCallRow } from "./RecentCallsSection";

type QueueItem = CallCardData & {
  callLineId: string | null;
  lineLabel: string | null;
};

type QueueTab = "waiting" | "active" | "ended";

/**
 * File d'appels — colonne 1 du layout iCom.
 *
 * Refonte : tabs En attente / En cours / Terminés + recherche, fidèle à la
 * maquette `agent-desktop.jsx > AgList`.
 *   - "En attente"  : queue Convex (`callCenter.listQueuedCallsForAgent`)
 *   - "En cours"    : activeCalls (slots actifs + parqués)
 *   - "Terminés"    : recentCalls (récents + manqués traités)
 */
export function IncomingCallQueue({
  calls,
  activeCalls,
  recentCalls,
  focusedMeetingId,
  pickingUpId,
  onPickup,
  onDecline,
  onFocus,
  onSelectActive,
  onCallBackRecent,
  pendingCallbackKeys,
}: {
  calls: QueueItem[];
  activeCalls: ActiveCallSlot[];
  recentCalls: RecentCallRow[];
  focusedMeetingId: Id<"meetings"> | null;
  pickingUpId: Id<"meetings"> | null;
  onPickup: (id: Id<"meetings">) => void;
  onDecline: (id: Id<"meetings">) => void;
  onFocus: (id: Id<"meetings">) => void;
  onSelectActive?: (id: Id<"meetings">) => void;
  /** Rappeler un citoyen depuis la liste Terminés. */
  onCallBackRecent?: (
    userId: Id<"users">,
    orgId: Id<"orgs">,
  ) => void | Promise<void>;
  /** Set des clés `${userId}:${orgId}` actuellement en cours de rappel. */
  pendingCallbackKeys?: Set<string>;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<QueueTab>("waiting");
  const [search, setSearch] = useState("");

  // Auto-bascule vers l'onglet "En cours" quand un appel est décroché.
  // (Évite que l'agent reste sur "En attente" vide après pickup.)
  // Note : on ne force que si la liste En attente est vide.
  // useEffect omis volontairement — le shell gère le focus.

  const counts = {
    waiting: calls.length,
    active: activeCalls.length,
    ended: recentCalls.length,
  };

  const q = search.trim().toLowerCase();
  const matches = (s: string | null | undefined) =>
    !q || (s ?? "").toLowerCase().includes(q);

  const filteredWaiting = useMemo(
    () =>
      calls.filter(
        (c) =>
          matches(c.caller.name) ||
          matches(c.caller.nip) ||
          matches(c.lineLabel),
      ),
    [calls, q],
  );

  const filteredActive = useMemo(
    () =>
      activeCalls.filter(
        (c) => matches(c.callerName) || matches(c.lineLabel ?? ""),
      ),
    [activeCalls, q],
  );

  const filteredEnded = useMemo(
    () =>
      recentCalls.filter(
        (r) => matches(r.caller?.displayName) || matches(r.lineLabel),
      ),
    [recentCalls, q],
  );

  return (
    <div className="flex flex-col min-h-0 h-full w-full bg-card/30">
      {/* Header — titre + recherche */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-[13px] font-bold tracking-tight">
          {t("callCenter.queue.title", "File d'appels")}
        </h2>
        <div className="relative mt-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "callCenter.queue.searchPlaceholder",
              "Rechercher un appelant…",
            )}
            className="h-9 !pl-10 text-[12.5px] bg-secondary/40 border-0"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pb-2 shrink-0 border-b">
        <TabButton
          label={t("callCenter.queue.tabWaiting", "En attente")}
          count={counts.waiting}
          active={tab === "waiting"}
          onClick={() => setTab("waiting")}
        />
        <TabButton
          label={t("callCenter.queue.tabActive", "En cours")}
          count={counts.active}
          active={tab === "active"}
          onClick={() => setTab("active")}
        />
        <TabButton
          label={t("callCenter.queue.tabEnded", "Terminés")}
          count={counts.ended}
          active={tab === "ended"}
          onClick={() => setTab("ended")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "waiting" && (
          <WaitingTab
            calls={filteredWaiting}
            focusedMeetingId={focusedMeetingId}
            pickingUpId={pickingUpId}
            onPickup={onPickup}
            onDecline={onDecline}
            onFocus={onFocus}
            isFiltered={q.length > 0}
          />
        )}
        {tab === "active" && (
          <ActiveTab
            calls={filteredActive}
            activeSlotId={focusedMeetingId}
            onSelect={onSelectActive ?? onFocus}
          />
        )}
        {tab === "ended" && (
          <EndedTab
            calls={filteredEnded}
            isFiltered={q.length > 0}
            onCallBackRecent={onCallBackRecent}
            pendingCallbackKeys={pendingCallbackKeys ?? EMPTY_SET}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Tab buttons + sub-views
// ════════════════════════════════════════════════════════════════════

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {label}
      {count > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-4 h-4 rounded-full px-1 text-[10px] font-semibold",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function WaitingTab({
  calls,
  focusedMeetingId,
  pickingUpId,
  onPickup,
  onDecline,
  onFocus,
  isFiltered,
}: {
  calls: (CallCardData & { callLineId: string | null; lineLabel: string | null })[];
  focusedMeetingId: Id<"meetings"> | null;
  pickingUpId: Id<"meetings"> | null;
  onPickup: (id: Id<"meetings">) => void;
  onDecline: (id: Id<"meetings">) => void;
  onFocus: (id: Id<"meetings">) => void;
  isFiltered: boolean;
}) {
  const { t } = useTranslation();

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={PhoneIncoming}
        title={
          isFiltered
            ? t("callCenter.queue.noResults", "Aucun appel correspondant")
            : t("callCenter.queue.empty", "Tout est calme")
        }
        hint={
          isFiltered
            ? t(
                "callCenter.queue.noResultsHint",
                "Essayez un autre terme de recherche.",
              )
            : t(
                "callCenter.queue.emptyHint",
                "Aucun appel en attente pour le moment.",
              )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {calls.map((call) => (
        <CallCard
          key={call._id}
          call={call}
          isFocused={focusedMeetingId === call._id}
          isPickingUp={pickingUpId === call._id}
          onPickup={() => onPickup(call._id as Id<"meetings">)}
          onDecline={() => onDecline(call._id as Id<"meetings">)}
          onFocus={() => onFocus(call._id as Id<"meetings">)}
        />
      ))}
    </div>
  );
}

function ActiveTab({
  calls,
  activeSlotId,
  onSelect,
}: {
  calls: ActiveCallSlot[];
  activeSlotId: Id<"meetings"> | null;
  onSelect: (id: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        title={t("callCenter.queue.activeEmpty", "Aucun appel actif")}
        hint={t(
          "callCenter.queue.activeEmptyHint",
          "Décrochez un appel depuis l'onglet En attente pour le voir apparaître ici.",
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {calls.map((c) => (
        <ActiveSlotRow
          key={c._id}
          slot={c}
          isFocused={activeSlotId === c._id}
          onSelect={() => onSelect(c._id as Id<"meetings">)}
        />
      ))}
    </div>
  );
}

function ActiveSlotRow({
  slot,
  isFocused,
  onSelect,
}: {
  slot: ActiveCallSlot;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const isHeld = slot.callStatus === "on_hold";
  const initials =
    slot.callerName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full grid grid-cols-[32px_1fr_auto] items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/40",
        isFocused && "border-primary/40 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold",
          isHeld
            ? "bg-warning/15 text-warning"
            : "bg-primary text-primary-foreground",
        )}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold truncate leading-tight">
          {slot.callerName}
        </p>
        <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
          {isHeld
            ? t("callCenter.conversation.onHold", "En attente")
            : t("callCenter.conversation.live", "En communication")}
          {slot.lineLabel && ` · ${slot.lineLabel}`}
        </p>
      </div>
      <span
        className={cn(
          "text-[10px] font-medium",
          isHeld ? "text-warning" : "text-primary",
        )}
      >
        {isHeld ? "•" : "●"}
      </span>
    </button>
  );
}

const EMPTY_SET: Set<string> = new Set();

function EndedTab({
  calls,
  isFiltered,
  onCallBackRecent,
  pendingCallbackKeys,
}: {
  calls: RecentCallRow[];
  isFiltered: boolean;
  onCallBackRecent?: (
    userId: Id<"users">,
    orgId: Id<"orgs">,
  ) => void | Promise<void>;
  pendingCallbackKeys: Set<string>;
}) {
  const { t } = useTranslation();

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        title={
          isFiltered
            ? t("callCenter.queue.noResults", "Aucun appel correspondant")
            : t("callCenter.queue.endedEmpty", "Aucun appel récent")
        }
        hint={
          isFiltered
            ? t(
                "callCenter.queue.noResultsHint",
                "Essayez un autre terme de recherche.",
              )
            : t(
                "callCenter.queue.endedEmptyHint",
                "Vos appels terminés apparaîtront ici.",
              )
        }
      />
    );
  }

  // Groupage simple par jour
  const groups = useMemoGroups(calls);

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {groups.map(([label, rows]) => (
        <div key={label} className="flex flex-col gap-1">
          <p className="px-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">
            {label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {rows.map((r) => (
              <li key={r._id}>
                <EndedRow
                  row={r}
                  onCallBackRecent={onCallBackRecent}
                  pendingCallbackKeys={pendingCallbackKeys}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EndedRow({
  row,
  onCallBackRecent,
  pendingCallbackKeys,
}: {
  row: RecentCallRow;
  onCallBackRecent?: (
    userId: Id<"users">,
    orgId: Id<"orgs">,
  ) => void | Promise<void>;
  pendingCallbackKeys: Set<string>;
}) {
  const ts = row.startedAt ?? row.endedAt;
  const time = ts
    ? new Date(ts).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const displayName = row.caller?.displayName ?? row.title ?? "Appelant inconnu";
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const wasMissed = !row.wasAnswered;

  const userId = row.caller?.userId as Id<"users"> | undefined;
  const orgId = row.orgId as Id<"orgs"> | null;
  const callbackKey = userId && orgId ? `${userId}:${orgId}` : null;
  const isCallingBack = callbackKey
    ? pendingCallbackKeys.has(callbackKey)
    : false;
  const canCallBack = !!(userId && orgId && onCallBackRecent);

  return (
    <div className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40">
      <span
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold",
          wasMissed
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium truncate">{displayName}</p>
        <p className="text-[10.5px] text-muted-foreground truncate">
          {row.lineLabel ?? ""}
          {row.lineLabel && " · "}
          {wasMissed ? "Manqué" : "Terminé"}
        </p>
      </div>
      <span className="text-[10.5px] text-muted-foreground tabular-nums">
        {time}
      </span>
      {canCallBack && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (userId && orgId) onCallBackRecent?.(userId, orgId);
          }}
          disabled={isCallingBack}
          aria-label="Rappeler"
          title="Rappeler"
          className="h-7 w-7 rounded-full bg-success/15 text-success hover:bg-success/25 disabled:opacity-60 flex items-center justify-center transition-colors"
        >
          {isCallingBack ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Phone className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <h3 className="text-[13px] font-semibold mt-1">{title}</h3>
      <p className="max-w-[220px] text-[11.5px] text-muted-foreground leading-snug">
        {hint}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════

function useMemoGroups(rows: RecentCallRow[]): Array<[string, RecentCallRow[]]> {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = new Map<string, RecentCallRow[]>();
    for (const r of rows) {
      const ts = r.startedAt ?? r.endedAt;
      let label: string;
      if (!ts || Number.isNaN(ts)) {
        label = "Date inconnue";
      } else {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) label = "Aujourd'hui";
        else if (d.getTime() === yesterday.getTime()) label = "Hier";
        else
          label = d.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
          });
      }
      const arr = groups.get(label) ?? [];
      arr.push(r);
      groups.set(label, arr);
    }
    return Array.from(groups.entries());
  }, [rows]);
}
