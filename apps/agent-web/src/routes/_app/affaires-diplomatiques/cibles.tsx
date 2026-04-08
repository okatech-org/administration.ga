/**
 * Phase 1 : Cibles — Identification et recherche IA
 *
 * Double mode : Découverte IA + Saisie manuelle avec enrichissement
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import {
  Target,
  Plus,
  Sparkles,
  Search,
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import { AIActionPanel, AIActionButton } from "@/components/diplomatic/AIActionPanel";
import { TargetPipelineCard } from "@/components/diplomatic/TargetPipelineCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/cibles",
)({
  component: CiblesPhase,
});

function CiblesPhase() {
  const { activeOrgId } = useOrg();
  const [searchFilter, setSearchFilter] = useState("");
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [showAIDiscover, setShowAIDiscover] = useState(false);
  const [showKBImport, setShowKBImport] = useState(false);

  const { data: targets, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listTargets,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: priorities } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getPriorities,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const createTarget = useConvexMutationQuery(
    api.functions.diplomaticAffairs.createTarget,
  );

  const addSourceDoc = useConvexMutationQuery(
    api.functions.diplomaticAffairs.addLocalSourceDocument,
  );

  const filtered = targets?.filter(
    (t) =>
      !searchFilter ||
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.sector?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.country?.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une cible..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKBImport(true)}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Import IA
            {priorities?.sourceDocuments && priorities.sourceDocuments.length > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1">
                {priorities.sourceDocuments.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddTarget(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
          <AIActionButton
            label="Découvrir via l'IA"
            icon={Sparkles}
            onClick={() => setShowAIDiscover(true)}
          />
        </div>
      </div>

      {/* Grille de cibles */}
      {!filtered || filtered.length === 0 ? (
        <EmptyTargets
          onAdd={() => setShowAddTarget(true)}
          onDiscover={() => setShowAIDiscover(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((target) => (
            <TargetPipelineCard key={target._id} target={target} />
          ))}
        </div>
      )}

      {/* Dialog : Ajout manuel */}
      <AddTargetDialog
        open={showAddTarget}
        onOpenChange={setShowAddTarget}
        orgId={activeOrgId}
        onSubmit={async (data) => {
          if (!activeOrgId) return;
          await createTarget.mutateAsync({ ...data, orgId: activeOrgId });
          toast.success("Cible ajoutée avec succès");
          setShowAddTarget(false);
        }}
      />

      {/* Dialog : Import IA (base de connaissances) */}
      <KBImportDialog
        open={showKBImport}
        onOpenChange={setShowKBImport}
        orgId={activeOrgId!}
        existingDocs={priorities?.sourceDocuments ?? []}
        onDocumentImported={async (doc) => {
          if (!activeOrgId) return;
          await addSourceDoc.mutateAsync({ orgId: activeOrgId, ...doc });
        }}
      />

      {/* Dialog : Découverte IA */}
      <AIDiscoverDialog
        open={showAIDiscover}
        onOpenChange={setShowAIDiscover}
        orgId={activeOrgId!}
        priorities={priorities}
      />
    </div>
  );
}

// ─── Composants internes ────────────────────────────────────────────────────

function EmptyTargets({
  onAdd,
  onDiscover,
}: {
  onAdd: () => void;
  onDiscover: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
        <Target className="h-8 w-8 text-blue-500/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Aucune cible identifiée</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Commencez par configurer vos priorités exécutives, puis laissez l'IA
        découvrir des cibles potentielles ou ajoutez-les manuellement.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Ajout manuel
        </Button>
        <Button onClick={onDiscover} className="gap-1.5">
          <Sparkles className="h-4 w-4" />
          Découvrir via l'IA
        </Button>
      </div>
    </div>
  );
}

function AddTargetDialog({
  open,
  onOpenChange,
  orgId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"orgs"> | null;
  onSubmit: (data: {
    name: string;
    type: "enterprise" | "government" | "ngo" | "international_org" | "academic" | "media" | "other";
    priority: "low" | "medium" | "high" | "critical";
    sector?: string;
    country?: string;
    city?: string;
    contactName?: string;
    contactEmail?: string;
    description?: string;
    tags?: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("enterprise");
  const [priority, setPriority] = useState<string>("medium");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: type as "enterprise",
        priority: priority as "medium",
        sector: sector || undefined,
        country: country || undefined,
        city: city || undefined,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        description: description || undefined,
      });
      // Reset
      setName("");
      setSector("");
      setCountry("");
      setCity("");
      setContactName("");
      setContactEmail("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AIActionPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter une cible"
      description="Ajoutez manuellement une entreprise ou organisme ciblé."
      icon={Plus}
      state="idle"
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Ajout en cours..." : "Ajouter la cible"}
      inputForm={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom de l'entreprise"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enterprise">Entreprise</SelectItem>
                  <SelectItem value="government">Gouvernement</SelectItem>
                  <SelectItem value="ngo">ONG</SelectItem>
                  <SelectItem value="international_org">Org. Internationale</SelectItem>
                  <SelectItem value="academic">Académique</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pays</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="France"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ville</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Secteur</Label>
              <Input
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="BTP, Énergie..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Contact</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nom du contact"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@entreprise.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la cible et raison du ciblage..."
              rows={3}
            />
          </div>
        </div>
      }
    />
  );
}

function KBImportDialog({
  open,
  onOpenChange,
  orgId,
  existingDocs,
  onDocumentImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"orgs">;
  existingDocs: Array<{ filename: string; aiSummary?: string; extractedCount?: number }>;
  onDocumentImported: (doc: {
    storageId: Id<"_storage">;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    aiSummary?: string;
    extractedCount?: number;
  }) => Promise<void>;
}) {
  const [files, setFiles] = useState<
    Array<{ name: string; status: "uploading" | "analyzing" | "done" | "error"; summary?: string }>
  >([]);
  const [processing, setProcessing] = useState(false);

  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );
  const extractAction = useAction(
    api.ai.diplomaticAI.extractPrioritiesFromDocument,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || processing) return;

      const validExts = [".pdf", ".md", ".json", ".txt", ".docx", ".pptx", ".png", ".jpg", ".jpeg"];
      const valid = acceptedFiles.filter((f) => {
        const ok = validExts.some((ext) => f.name.toLowerCase().endsWith(ext));
        if (!ok) toast.error(`${f.name} : format non supporté`);
        if (f.size > 15 * 1024 * 1024) { toast.error(`${f.name} : max 15 Mo`); return false; }
        return ok;
      });
      if (valid.length === 0) return;

      setProcessing(true);
      setFiles(valid.map((f) => ({ name: f.name, status: "uploading" })));

      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        try {
          // Upload
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f));
          const postUrl = await generateUploadUrl({});
          const res = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!res.ok) throw new Error("Upload échoué");
          const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

          // Analyse IA
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "analyzing" } : f));
          const result = await extractAction({
            storageId,
            filename: file.name,
            mimeType: file.type || "text/plain",
          });

          // Persister le document dans la base de connaissances
          await onDocumentImported({
            storageId,
            filename: file.name,
            mimeType: file.type || "text/plain",
            sizeBytes: file.size,
            aiSummary: result.documentSummary,
            extractedCount: result.priorities.length,
          });

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "done", summary: result.documentSummary } : f,
            ),
          );
        } catch (error) {
          console.error(`Erreur import ${file.name}:`, error);
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "error" } : f));
          toast.error(`Erreur lors de l'analyse de ${file.name}`);
        }
      }

      setProcessing(false);
      toast.success("Import terminé — base de connaissances mise à jour");
    },
    [generateUploadUrl, extractAction, onDocumentImported, processing],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "application/json": [".json"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 15 * 1024 * 1024,
    disabled: processing,
  });

  return (
    <AIActionPanel
      open={open}
      onOpenChange={(v) => {
        if (!v && !processing) {
          setFiles([]);
          onOpenChange(false);
        }
      }}
      title="Import IA — Base de connaissances"
      description="Importez des documents pour enrichir la base de connaissances de votre représentation. L'IA extrait et structure les informations automatiquement."
      icon={Upload}
      state={processing ? "loading" : "idle"}
      onSubmit={() => {}}
      submitLabel=""
      loadingMessage="L'IA analyse vos documents..."
      inputForm={
        <div className="space-y-4">
          {/* Zone de drop */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
            } ${processing ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">
              {isDragActive ? "Déposez les fichiers..." : "Glissez vos documents ici"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              PDF, Word, PowerPoint, Images, Markdown, JSON, TXT — Multi-fichiers
            </p>
          </div>

          {/* Progression des fichiers en cours */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {f.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : f.status === "error" ? (
                    <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  )}
                  <span className="truncate flex-1">{f.name}</span>
                  {f.status === "analyzing" && (
                    <span className="text-[9px] text-primary">Analyse IA...</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Documents existants */}
          {existingDocs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">
                Documents dans la base ({existingDocs.length})
              </p>
              {existingDocs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{d.filename}</span>
                  {d.extractedCount != null && (
                    <Badge variant="secondary" className="text-[8px] shrink-0">
                      {d.extractedCount} infos
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}

function AIDiscoverDialog({
  open,
  onOpenChange,
  orgId,
  priorities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"orgs">;
  priorities: {
    hostCountry: string;
    priorities: Array<{ title: string; sector: string; keywords: string[] }>;
    defaultTargetsPerSearch?: number;
    sourceDocuments?: Array<{ filename: string; aiSummary?: string }>;
  } | null | undefined;
}) {
  const [state, setState] = useState<"idle" | "loading" | "result">("idle");
  const [resultCount, setResultCount] = useState(0);
  const discoverAction = useAction(api.ai.diplomaticAI.discoverTargets);

  const maxResults = priorities?.defaultTargetsPerSearch ?? 5;

  const handleDiscover = async () => {
    if (!priorities || priorities.priorities.length === 0) {
      toast.error("Configurez vos priorités exécutives d'abord.");
      return;
    }

    setState("loading");
    try {
      const result = await discoverAction({
        orgId,
        hostCountry: priorities.hostCountry,
        priorities: priorities.priorities.map((p) => ({
          title: p.title,
          sector: p.sector,
          keywords: p.keywords ?? [],
        })),
        maxResults: maxResults,
        sourceDocumentSummaries: priorities.sourceDocuments
          ?.filter((d) => d.aiSummary)
          .map((d) => `${d.filename}: ${d.aiSummary}`) ?? [],
      });

      setResultCount(result.count);
      setState("result");
      toast.success(`${result.count} cible(s) découverte(s) par l'IA`);
    } catch (error) {
      console.error("Erreur découverte IA:", error);
      toast.error("Erreur lors de la recherche IA. Réessayez.");
      setState("idle");
    }
  };

  return (
    <AIActionPanel
      open={open}
      onOpenChange={(v) => {
        if (!v) setState("idle");
        onOpenChange(v);
      }}
      title="Découvrir des cibles via l'IA"
      description="L'IA recherche des entreprises et organismes dans votre pays hôte selon vos priorités."
      icon={Sparkles}
      state={state}
      onSubmit={handleDiscover}
      submitLabel={`Rechercher ${maxResults} cibles`}
      loadingMessage="L'IA analyse les opportunités dans votre pays hôte..."
      resultView={
        <div className="text-center space-y-2 py-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Target className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-sm font-medium">{resultCount} cible(s) découverte(s)</p>
          <p className="text-xs text-muted-foreground">
            Les cibles ont été ajoutées au pipeline en phase de ciblage.
          </p>
        </div>
      }
      onValidate={() => {
        onOpenChange(false);
        setState("idle");
      }}
      validateLabel="Fermer"
      inputForm={
        <div className="space-y-3">
          {priorities ? (
            <>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">
                  Pays hôte : {priorities.hostCountry}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {priorities.priorities.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {p.title} ({p.sector})
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                L'IA va rechercher <strong>{maxResults}</strong> partenaires
                potentiels dans ces secteurs prioritaires en{" "}
                {priorities.hostCountry}.
              </p>
              {priorities.sourceDocuments && priorities.sourceDocuments.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {priorities.sourceDocuments.length} document(s) de référence
                  seront utilisés comme base de connaissances.
                </p>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Veuillez d'abord configurer vos priorités exécutives.
              </p>
            </div>
          )}
        </div>
      }
    />
  );
}
