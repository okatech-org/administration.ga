/**
 * Phase 4 : Rapports — Rapports a la hierarchie
 *
 * Dialog IA : import documents reunion + compilation rapport global
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  BarChart3,
  Sparkles,
  Loader2,
  FileDown,
  Upload,
  CheckCircle2,
  X,
  Target,
  Users,
  Briefcase,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { useOrg } from "@/components/org/org-provider";
import {
  AIActionPanel,
  AIActionButton,
} from "@/components/diplomatic/AIActionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_app/affaires-diplomatiques/rapports",
)({
  component: RapportsPhase,
});

const RECIPIENT_LABEL: Record<string, string> = {
  president: "President",
  minister: "Ministre",
  secretary_general: "Secretaire General",
  direction: "Direction",
  other: "Autre",
};

const TYPE_LABEL: Record<string, string> = {
  activity: "Activite",
  situation: "Situation",
  mission: "Mission",
  economic: "Economique",
  security: "Securite",
  annual: "Annuel",
  other: "Autre",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-zinc-500/15 text-zinc-400" },
  pending_review: {
    label: "En revision",
    color: "bg-warning/15 text-warning",
  },
  approved: { label: "Approuve", color: "bg-primary/15 text-primary" },
  submitted: {
    label: "Soumis",
    color: "bg-success/15 text-success",
  },
  archived: { label: "Archive", color: "bg-zinc-500/15 text-zinc-400" },
};

function RapportsPhase() {
  const { activeOrgId } = useOrg();

  // Dialog state
  const [showCompileDialog, setShowCompileDialog] = useState(false);
  const [compileState, setCompileState] = useState<
    "idle" | "loading" | "result" | "error"
  >("idle");
  const [compileError, setCompileError] = useState("");
  const [compileResult, setCompileResult] = useState<{
    reportId: Id<"diplomaticReports">;
    title: string;
    summary: string;
    content: string;
    statistics: Record<string, number>;
    recommendations: string[];
  } | null>(null);

  // Form fields
  const [reportType, setReportType] = useState<string>("activity");
  const [recipientType, setRecipientType] = useState<string>("minister");
  const [period, setPeriod] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // Import documents state
  const [importedFiles, setImportedFiles] = useState<
    Array<{
      name: string;
      status: "uploading" | "analyzing" | "done" | "error";
      summary?: string;
    }>
  >([]);
  const [processingImport, setProcessingImport] = useState(false);

  // Queries
  const { data: reports, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.listReports,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  const { data: priorities } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getPriorities,
    activeOrgId ? { orgId: activeOrgId } : "skip",
  );

  // Mutations
  const addSourceDoc = useConvexMutationQuery(
    api.functions.diplomaticAffairs.addLocalSourceDocument,
  );

  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl,
  );

  // Actions IA
  const compileReportAction = useAction(api.ai.diplomaticAI.compileReport);
  const extractAction = useAction(
    api.ai.diplomaticAI.extractPrioritiesFromDocument,
  );

  // Dropzone pour import documents reunion
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || processingImport || !activeOrgId)
        return;

      const validExts = [
        ".pdf",
        ".md",
        ".json",
        ".txt",
        ".docx",
        ".pptx",
        ".png",
        ".jpg",
        ".jpeg",
      ];
      const valid = acceptedFiles.filter((f) => {
        const ok = validExts.some((ext) =>
          f.name.toLowerCase().endsWith(ext),
        );
        if (!ok) toast.error(`${f.name} : format non supporte`);
        if (f.size > 15 * 1024 * 1024) {
          toast.error(`${f.name} : max 15 Mo`);
          return false;
        }
        return ok;
      });
      if (valid.length === 0) return;

      setProcessingImport(true);
      setImportedFiles(valid.map((f) => ({ name: f.name, status: "uploading" })));

      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        try {
          // Upload
          setImportedFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "uploading" } : f,
            ),
          );
          const postUrl = await generateUploadUrl({});
          const res = await fetch(postUrl, {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
          if (!res.ok) throw new Error("Upload echoue");
          const { storageId } = (await res.json()) as {
            storageId: Id<"_storage">;
          };

          // Analyse IA
          setImportedFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "analyzing" } : f,
            ),
          );
          const result = await extractAction({
            storageId,
            filename: file.name,
            mimeType: file.type || "text/plain",
          });

          // Persister dans la base de connaissances
          await addSourceDoc.mutateAsync({
            orgId: activeOrgId,
            storageId,
            filename: file.name,
            mimeType: file.type || "text/plain",
            sizeBytes: file.size,
            aiSummary: result.documentSummary,
            extractedCount: result.priorities.length,
          });

          setImportedFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: "done", summary: result.documentSummary }
                : f,
            ),
          );
        } catch (error) {
          console.error(`Erreur import ${file.name}:`, error);
          setImportedFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "error" } : f,
            ),
          );
          toast.error(`Erreur lors de l'analyse de ${file.name}`);
        }
      }

      setProcessingImport(false);
      toast.success(
        "Documents importes — ils seront utilises comme contexte pour le rapport",
      );
    },
    [
      generateUploadUrl,
      extractAction,
      addSourceDoc,
      activeOrgId,
      processingImport,
    ],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "application/json": [".json"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 15 * 1024 * 1024,
    disabled: processingImport,
  });

  const handleCompileReport = async () => {
    if (!activeOrgId) return;
    if (!period.trim()) {
      toast.error("Indiquez la periode couverte");
      return;
    }
    setCompileState("loading");
    setCompileError("");
    try {
      const result = await compileReportAction({
        orgId: activeOrgId,
        recipientType: recipientType as
          | "president"
          | "minister"
          | "secretary_general"
          | "direction"
          | "other",
        reportType: reportType as
          | "activity"
          | "situation"
          | "mission"
          | "economic"
          | "annual"
          | "other",
        period: period.trim(),
        additionalContext: additionalContext.trim() || undefined,
      });
      setCompileResult(result);
      setCompileState("result");
      toast.success(`Rapport "${result.title}" compile avec succes`);
    } catch (error) {
      console.error("Erreur compilation rapport:", error);
      setCompileError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la compilation du rapport",
      );
      setCompileState("error");
    }
  };

  const resetDialog = () => {
    setCompileState("idle");
    setCompileResult(null);
    setCompileError("");
    setPeriod("");
    setAdditionalContext("");
    setImportedFiles([]);
  };

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {reports?.length ?? 0} rapport(s)
        </p>
        <AIActionButton
          label="Compiler un rapport"
          icon={Sparkles}
          onClick={() => {
            resetDialog();
            setShowCompileDialog(true);
          }}
        />
      </div>

      {/* Liste des rapports */}
      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-destructive/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Aucun rapport</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Preparez des rapports d'activite pour le President, les Ministres
            et votre hierarchie. Importez vos comptes-rendus de reunion
            pour enrichir le rapport.
          </p>
          <Button
            className="gap-1.5"
            onClick={() => {
              resetDialog();
              setShowCompileDialog(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Compiler un rapport
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const status =
              STATUS_LABEL[report.status] ?? STATUS_LABEL.draft;
            return (
              <Card
                key={report._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[report.type] ?? report.type} • Pour :{" "}
                      {RECIPIENT_LABEL[report.recipient] ?? report.recipient}
                      {report.period && ` • ${report.period}`}
                    </p>
                    {report.aiGeneratedSummary && (
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
                        <Sparkles className="h-3 w-3" />
                        Resume genere par l'IA
                      </div>
                    )}
                    {report.statistics && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px]">
                          {report.statistics.totalTargets} cibles
                        </Badge>
                        <Badge variant="secondary" className="text-[9px]">
                          {report.statistics.contactedTargets} contactees
                        </Badge>
                        <Badge variant="secondary" className="text-[9px]">
                          {report.statistics.projectsInitiated} projets
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(report.status === "approved" ||
                      report.status === "submitted") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() =>
                          toast.info("Export PDF bientot disponible")
                        }
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    )}
                    <Badge className={cn("text-[9px]", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog IA : Compiler un rapport */}
      <AIActionPanel
        open={showCompileDialog}
        onOpenChange={(v) => {
          if (!v && compileState !== "loading" && !processingImport) {
            setShowCompileDialog(false);
            resetDialog();
          }
        }}
        title="Compiler un rapport d'activite"
        description="L'IA compile un rapport a partir de toute l'activite diplomatique et des documents importes."
        icon={BarChart3}
        state={processingImport ? "loading" : compileState}
        errorMessage={compileError}
        onSubmit={handleCompileReport}
        submitLabel="Compiler le rapport"
        loadingMessage={
          processingImport
            ? "Analyse des documents importes..."
            : "Compilation du rapport en cours..."
        }
        validateLabel="Fermer"
        onValidate={() => {
          setShowCompileDialog(false);
          resetDialog();
        }}
        onRegenerate={handleCompileReport}
        inputForm={
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Type de rapport */}
              <div className="space-y-1.5">
                <Label className="text-xs">Type de rapport</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activite</SelectItem>
                    <SelectItem value="situation">Situation</SelectItem>
                    <SelectItem value="mission">Mission</SelectItem>
                    <SelectItem value="economic">Economique</SelectItem>
                    <SelectItem value="annual">Annuel</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destinataire */}
              <div className="space-y-1.5">
                <Label className="text-xs">Destinataire</Label>
                <Select
                  value={recipientType}
                  onValueChange={setRecipientType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="president">President</SelectItem>
                    <SelectItem value="minister">Ministre</SelectItem>
                    <SelectItem value="secretary_general">
                      Secretaire General
                    </SelectItem>
                    <SelectItem value="direction">Direction</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Periode */}
            <div className="space-y-1.5">
              <Label className="text-xs">Periode couverte *</Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Ex: Janvier - Mars 2026"
              />
            </div>

            {/* Contexte additionnel */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Instructions specifiques (optionnel)
              </Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Points a couvrir, focus particulier, instructions..."
                rows={2}
              />
            </div>

            {/* Zone import documents reunion */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Documents de reunion (optionnel)
              </Label>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30",
                  processingImport && "opacity-50 pointer-events-none",
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 text-primary mx-auto mb-1.5" />
                <p className="text-xs font-medium">
                  {isDragActive
                    ? "Deposez les fichiers..."
                    : "Glissez vos comptes-rendus de reunion"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  PDF, Word, TXT, Markdown — Ils enrichissent le contexte du
                  rapport
                </p>
              </div>
            </div>

            {/* Fichiers importes */}
            {importedFiles.length > 0 && (
              <div className="space-y-1">
                {importedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {f.status === "done" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    ) : f.status === "error" ? (
                      <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                    )}
                    <span className="truncate flex-1">{f.name}</span>
                    {f.status === "analyzing" && (
                      <span className="text-[9px] text-primary">
                        Analyse IA...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Documents deja dans la base */}
            {priorities?.sourceDocuments &&
              priorities.sourceDocuments.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-2 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {priorities.sourceDocuments.length} document(s) dans la
                    base de connaissances — seront utilises comme contexte
                  </p>
                  {priorities.sourceDocuments.slice(0, 3).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{d.filename}</span>
                    </div>
                  ))}
                  {priorities.sourceDocuments.length > 3 && (
                    <p className="text-[9px] text-muted-foreground">
                      +{priorities.sourceDocuments.length - 3} autres
                    </p>
                  )}
                </div>
              )}
          </div>
        }
        resultView={
          compileResult ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                <p className="text-sm font-medium mb-1">
                  {compileResult.title}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {compileResult.summary}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-8">
                  {compileResult.content}
                </p>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {compileResult.statistics.totalTargets}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Cibles</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-success" />
                  <p className="text-lg font-bold">
                    {compileResult.statistics.contactedTargets}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Contactees
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1 text-warning" />
                  <p className="text-lg font-bold">
                    {compileResult.statistics.meetingsHeld}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Reunions
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <Briefcase className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {compileResult.statistics.projectsInitiated}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Projets</p>
                </div>
              </div>

              {/* Recommandations */}
              {compileResult.recommendations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Recommandations</p>
                  <ul className="space-y-0.5">
                    {compileResult.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary shrink-0">•</span>
                        {typeof r === "string" ? r : (r as { title?: string }).title ?? JSON.stringify(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-1 text-[10px] text-primary">
                <Sparkles className="h-3 w-3" />
                Rapport compile par l'IA a partir de l'activite diplomatique
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
