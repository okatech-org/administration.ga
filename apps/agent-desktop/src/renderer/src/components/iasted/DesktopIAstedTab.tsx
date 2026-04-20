/**
 * DesktopIAstedTab — thin wrapper used as the `renderIAstedTab` DI slot of
 * `<AppShell>` in agent-desktop.
 *
 * For Étape 4, the full iAsted admin experience (LLM chat, voice, call queues,
 * contact directory…) has not been ported to the Electron renderer yet. Each
 * tab renders a placeholder so the iAsted floating window stays usable as a
 * visual scaffold. Étape 6 will inject the real tab hosts (mirroring agent-web's
 * `IAstedTabHost` in `app-layout.tsx`).
 */

import type { IAstedTabId } from "@workspace/iasted";

interface DesktopIAstedTabProps {
  tab: IAstedTabId;
}

const LABELS: Record<IAstedTabId, string> = {
  ichat: "iChat",
  icontact: "iContact",
  icall: "iAppel",
  iqueue: "File d'attente",
  ivoicemail: "Messagerie vocale",
  imeeting: "iRéunion",
  isettings: "Réglages iAsted",
};

// TODO(v1.0.1): wire real desktop iAsted tab hosts (useAdminAIChat,
// useAdminVoiceChat, call-center components…) — see agent-web's IAstedTabHost.
export function DesktopIAstedTab({ tab }: DesktopIAstedTabProps) {
  const label = LABELS[tab] ?? tab;
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center space-y-2 max-w-xs">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          Module en cours d&apos;intégration dans l&apos;application desktop.
        </p>
      </div>
    </div>
  );
}
