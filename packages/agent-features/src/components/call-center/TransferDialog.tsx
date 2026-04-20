"use client";

import { ArrowRightLeft, Loader2, Phone, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useAuthenticatedConvexQuery } from "@workspace/api/hooks";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Dialog de transfert — permet de rediriger un appel actif
 * vers un autre agent (via org-chart) ou une autre ligne.
 */
export function TransferDialog({
  open,
  onOpenChange,
  orgId,
  meetingId,
  onTransfer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"orgs"> | null;
  meetingId: Id<"meetings"> | null;
  onTransfer: (
    meetingId: Id<"meetings">,
    target: { userId?: Id<"users">; lineId?: Id<"callLines"> },
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: orgChart } = useAuthenticatedConvexQuery(
    api.functions.orgs.getOrgChart,
    orgId ? { orgId } : "skip",
  );
  const { data: lines } = useAuthenticatedConvexQuery(
    api.functions.callLines.listForAdmin,
    orgId ? { orgId } : "skip",
  );

  const agents: Array<{
    userId: Id<"users">;
    name: string;
    position: string;
  }> = [];
  if (orgChart) {
    for (const pos of (orgChart as any).positions ?? []) {
      for (const occ of pos.occupants ?? []) {
        const name = `${occ.firstName ?? ""} ${occ.lastName ?? ""}`.trim();
        if (!name) continue;
        agents.push({
          userId: occ.userId,
          name,
          position: pos.title?.fr ?? pos.code,
        });
      }
    }
  }

  const filteredAgents = search
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.position.toLowerCase().includes(search.toLowerCase()),
      )
    : agents.slice(0, 20);
  const activeLines = (lines ?? []).filter((l: any) => l.isActive);

  const handleTarget = async (target: {
    userId?: Id<"users">;
    lineId?: Id<"callLines">;
  }) => {
    if (!meetingId) return;
    setSubmitting(true);
    try {
      await onTransfer(meetingId, target);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            {t("callCenter.action.transfer")}
          </DialogTitle>
          <DialogDescription>
            {t("callCenter.transfer.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="agent">
          <TabsList className="w-full">
            <TabsTrigger value="agent" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t("callCenter.transfer.toAgent")}
            </TabsTrigger>
            <TabsTrigger value="line" className="flex-1 gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {t("callCenter.transfer.toLine")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="mt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("callCenter.transfer.searchAgent")}
              className="h-9 text-sm"
            />
            <ScrollArea className="mt-2 h-64">
              <ul className="flex flex-col gap-1">
                {filteredAgents.map((a) => (
                  <li key={a.userId as string}>
                    <button
                      type="button"
                      onClick={() => handleTarget({ userId: a.userId })}
                      disabled={submitting}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors",
                        "hover:bg-muted/40 disabled:opacity-50",
                      )}
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{a.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {a.position}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
                {filteredAgents.length === 0 && (
                  <li className="py-6 text-center text-xs text-muted-foreground">
                    {t("callCenter.transfer.noAgent")}
                  </li>
                )}
              </ul>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="line" className="mt-2">
            <ScrollArea className="h-64">
              <ul className="flex flex-col gap-1">
                {activeLines.map((l: any) => (
                  <li key={l._id}>
                    <button
                      type="button"
                      onClick={() => handleTarget({ lineId: l._id })}
                      disabled={submitting}
                      className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 disabled:opacity-50"
                    >
                      {l.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{l.label}</p>
                        {l.description && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {l.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
                {activeLines.length === 0 && (
                  <li className="py-6 text-center text-xs text-muted-foreground">
                    {t("callCenter.transfer.noLine")}
                  </li>
                )}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {submitting && (
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("callCenter.transfer.transferring")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
