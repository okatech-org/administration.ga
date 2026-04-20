"use client";

import {
  ArrowRightLeft,
  Calendar,
  FileText,
  Megaphone,
} from "lucide-react";
import { useRouter } from "@workspace/routing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { TransferDialog } from "./TransferDialog";

/**
 * Footer sticky du drawer — actions rapides liées à l'appel actif.
 *
 * Sprint 5 : navigations vers les modules existants + transfert + escalade.
 * Sprint 6+ : voicemail, rappel programmé, envoi SMS direct.
 */
export function QuickActions({
  orgId,
  activeMeetingId,
  callerUserId,
  onTransfer,
  onEscalate,
}: {
  orgId: Id<"orgs"> | null;
  activeMeetingId: Id<"meetings"> | null;
  callerUserId: string | null;
  onTransfer: (
    meetingId: Id<"meetings">,
    target: { userId?: Id<"users">; lineId?: Id<"callLines"> },
  ) => Promise<void>;
  onEscalate?: (meetingId: Id<"meetings">) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);

  const hasActiveCall = !!activeMeetingId;

  const createRequest = () => {
    // Ouvre la page de création de demande avec le citoyen pré-rempli
    if (callerUserId) {
      router.push(`/affaires-consulaires?createForUserId=${callerUserId}`);
    } else {
      router.push("/affaires-consulaires");
    }
  };

  const scheduleAppointment = () => {
    if (callerUserId) {
      router.push(`/appointments?createForUserId=${callerUserId}`);
    } else {
      router.push("/appointments");
    }
  };

  const escalate = () => {
    if (!activeMeetingId) return;
    onEscalate?.(activeMeetingId);
    toast.success(t("callCenter.quickActions.escalated"), {
      description: t("callCenter.quickActions.escalateHint"),
    });
  };

  return (
    <>
      <div
        className={cn(
          "sticky bottom-0 z-10 flex flex-wrap gap-1.5 border-t bg-background/95 px-4 py-3 backdrop-blur",
          !hasActiveCall && "opacity-70",
        )}
      >
        {!hasActiveCall && (
          <p className="w-full pb-1 text-[10px] text-muted-foreground">
            {t("callCenter.quickActions.needActiveCall")}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={createRequest}
        >
          <FileText className="h-3 w-3" />
          {t("callCenter.quickActions.createRequest")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={scheduleAppointment}
        >
          <Calendar className="h-3 w-3" />
          {t("callCenter.quickActions.scheduleAppointment")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={() => setTransferOpen(true)}
          disabled={!hasActiveCall}
        >
          <ArrowRightLeft className="h-3 w-3" />
          {t("callCenter.quickActions.transfer")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={escalate}
          disabled={!hasActiveCall}
        >
          <Megaphone className="h-3 w-3" />
          {t("callCenter.quickActions.escalate")}
        </Button>
      </div>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        orgId={orgId}
        meetingId={activeMeetingId}
        onTransfer={onTransfer}
      />
    </>
  );
}
