export const dynamic = "force-dynamic";

import { AIActivityFeed } from "@/components/ai/proactive/AIActivityFeed";

export default function AIAssistantActivityPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Activité IA</h1>
        <p className="text-sm text-muted-foreground">
          Historique des suggestions, actions auto-appliquées et erreurs de
          l&apos;assistant IA proactif.
        </p>
      </div>
      <AIActivityFeed />
    </div>
  );
}
