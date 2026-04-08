/**
 * PriorityDocumentImporter — Import de documents + extraction IA
 *
 * Flux : drop file → upload → IA analyse → review → import priorités
 * Supporte PDF, Markdown, JSON, TXT
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  X,
  Check,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { useAction } from "convex/react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExtractedPriority {
  title: string;
  sector: string;
  description: string;
  keywords: string[];
  selected: boolean;
}

type ImporterState = "idle" | "uploading" | "analyzing" | "review";

interface PriorityDocumentImporterProps {
  onPrioritiesExtracted: (
    priorities: Array<{
      title: string;
      sector: string;
      description?: string;
      keywords: string[];
    }>,
  ) => void;
  /** Appelé après import réussi pour persister le document source */
  onDocumentImported?: (doc: {
    storageId: Id<"_storage">;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    aiSummary: string;
    extractedCount: number;
  }) => void;
  compact?: boolean;
}

// ─── Composant ──────────────────────────────────────────────────────────────

interface FileProgress {
  name: string;
  status: "uploading" | "analyzing" | "done" | "error";
  extractedCount?: number;
}

export function PriorityDocumentImporter({
  onPrioritiesExtracted,
  onDocumentImported,
  compact = false,
}: PriorityDocumentImporterProps) {
  const [state, setState] = useState<ImporterState>("idle");
  const [extractedPriorities, setExtractedPriorities] = useState<
    ExtractedPriority[]
  >([]);
  const [documentSummary, setDocumentSummary] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);

  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );
  const extractAction = useAction(
    api.ai.diplomaticAI.extractPrioritiesFromDocument,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Valider tous les fichiers
      const validTypes = [
        "application/pdf",
        "application/json",
        "text/markdown",
        "text/plain",
      ];
      const validExtensions = [".pdf", ".md", ".json", ".txt"];
      const validFiles = acceptedFiles.filter((file) => {
        const hasValidExt = validExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        );
        if (!validTypes.includes(file.type) && !hasValidExt) {
          toast.error(`${file.name} : format non supporté`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} : trop volumineux (max 10 Mo)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      // Initialiser le suivi de progression
      setFileProgress(
        validFiles.map((f) => ({ name: f.name, status: "uploading" as const })),
      );
      setState("uploading");

      const allPriorities: ExtractedPriority[] = [];
      const summaries: string[] = [];
      let totalConfidence = 0;
      let doneCount = 0;

      // Traiter chaque fichier séquentiellement
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        try {
          // Upload
          setFileProgress((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "uploading" } : f,
            ),
          );

          const postUrl = await generateUploadUrl({});
          const uploadResult = await fetch(postUrl, {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
          if (!uploadResult.ok) throw new Error("Upload échoué");
          const { storageId } = (await uploadResult.json()) as {
            storageId: Id<"_storage">;
          };

          // Analyse IA
          setFileProgress((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "analyzing" } : f,
            ),
          );
          setState("analyzing");

          const result = await extractAction({
            storageId,
            filename: file.name,
            mimeType: file.type || "text/plain",
          });

          // Collecter les résultats
          allPriorities.push(
            ...result.priorities.map((p) => ({ ...p, selected: true })),
          );
          summaries.push(`${file.name}: ${result.documentSummary}`);
          totalConfidence += result.confidence;
          doneCount++;

          setFileProgress((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? {
                    ...f,
                    status: "done",
                    extractedCount: result.priorities.length,
                  }
                : f,
            ),
          );

          // Notifier le parent pour persister le document source
          if (onDocumentImported) {
            onDocumentImported({
              storageId,
              filename: file.name,
              mimeType: file.type || "text/plain",
              sizeBytes: file.size,
              aiSummary: result.documentSummary,
              extractedCount: result.priorities.length,
            });
          }
        } catch (error) {
          console.error(`Erreur import ${file.name}:`, error);
          setFileProgress((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "error" } : f,
            ),
          );
          toast.error(`Erreur lors de l'analyse de ${file.name}`);
        }
      }

      // Passer en review avec tous les résultats cumulés
      if (allPriorities.length > 0) {
        setExtractedPriorities(allPriorities);
        setDocumentSummary(summaries.join("\n"));
        setConfidence(
          doneCount > 0 ? Math.round(totalConfidence / doneCount) : 0,
        );
        setState("review");
      } else {
        setState("idle");
        setFileProgress([]);
      }
    },
    [generateUploadUrl, extractAction, onDocumentImported],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "application/json": [".json"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: state !== "idle",
  });

  const togglePriority = (index: number) => {
    setExtractedPriorities((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, selected: !p.selected } : p,
      ),
    );
  };

  const toggleAll = () => {
    const allSelected = extractedPriorities.every((p) => p.selected);
    setExtractedPriorities((prev) =>
      prev.map((p) => ({ ...p, selected: !allSelected })),
    );
  };

  const handleImport = () => {
    const selected = extractedPriorities
      .filter((p) => p.selected)
      .map(({ selected: _, ...p }) => p);

    if (selected.length === 0) {
      toast.error("Sélectionnez au moins une priorité.");
      return;
    }

    onPrioritiesExtracted(selected);
    toast.success(`${selected.length} priorité(s) importée(s)`);
    reset();
  };

  const reset = () => {
    setState("idle");
    setExtractedPriorities([]);
    setDocumentSummary("");
    setConfidence(0);
    setFileProgress([]);
  };

  const selectedCount = extractedPriorities.filter((p) => p.selected).length;

  // ─── Rendu ──────────────────────────────────────────────────────────

  // État idle : zone de drop
  if (state === "idle") {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl transition-all cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/30 hover:bg-muted/30",
          compact ? "px-3 py-2" : "p-6",
        )}
      >
        <input {...getInputProps()} />
        {compact ? (
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap">
              {isDragActive ? "Déposez..." : "Importer"}
            </span>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              PDF, MD, JSON
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Déposez les documents..."
                  : "Importer des documents"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Markdown, JSON, TXT — Multi-sélection possible — L'IA
                extraira les priorités automatiquement
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // État uploading / analyzing — progression multi-fichiers
  if (state === "uploading" || state === "analyzing") {
    const doneFiles = fileProgress.filter((f) => f.status === "done").length;
    const totalFiles = fileProgress.length;

    return (
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <Loader2 className="h-4 w-4 text-primary animate-spin absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Analyse en cours... ({doneFiles}/{totalFiles})
              </p>
              <p className="text-xs text-muted-foreground">
                Extraction des priorités stratégiques
              </p>
            </div>
          </div>
          {/* Détail par fichier */}
          <div className="space-y-1.5 pl-14">
            {fileProgress.map((fp, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {fp.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : fp.status === "error" ? (
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                )}
                <span
                  className={cn(
                    "truncate",
                    fp.status === "done"
                      ? "text-muted-foreground"
                      : fp.status === "error"
                        ? "text-destructive"
                        : "text-foreground font-medium",
                  )}
                >
                  {fp.name}
                </span>
                {fp.extractedCount != null && (
                  <Badge variant="secondary" className="text-[8px] shrink-0">
                    {fp.extractedCount} priorités
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // État review : résultats de l'extraction
  return (
    <div className="space-y-3">
      {/* En-tête résultat */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {extractedPriorities.length} priorités extraites
              </p>
              <p className="text-[10px] text-muted-foreground">
                {fileProgress.length > 1
                  ? `${fileProgress.filter((f) => f.status === "done").length} fichiers analysés`
                  : fileProgress[0]?.name ?? ""}{" "}
                — Confiance : {confidence}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-xs"
            >
              {extractedPriorities.every((p) => p.selected)
                ? "Tout désélectionner"
                : "Tout sélectionner"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={reset}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résumé du document */}
      {documentSummary && (
        <p className="text-xs text-muted-foreground italic px-1">
          {documentSummary}
        </p>
      )}

      {/* Liste des priorités extraites */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {extractedPriorities.map((p, i) => (
          <Card
            key={i}
            className={cn(
              "transition-all cursor-pointer",
              p.selected
                ? "border-primary/30 bg-primary/5"
                : "opacity-50",
            )}
            onClick={() => togglePriority(i)}
          >
            <CardContent className="py-2 px-3 flex items-start gap-3">
              <Checkbox
                checked={p.selected}
                onCheckedChange={() => togglePriority(i)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {p.sector}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                )}
                {p.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.keywords.slice(0, 5).map((kw, j) => (
                      <Badge
                        key={j}
                        variant="secondary"
                        className="text-[8px]"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bouton d'import */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {selectedCount}/{extractedPriorities.length} sélectionnées
        </p>
        <Button
          onClick={handleImport}
          disabled={selectedCount === 0}
          className="gap-1.5"
          size="sm"
        >
          <Check className="h-3.5 w-3.5" />
          Importer {selectedCount} priorité(s)
        </Button>
      </div>
    </div>
  );
}
