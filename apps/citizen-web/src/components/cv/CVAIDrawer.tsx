/**
 * CVAIDrawer -- Bottom sheet that slides up from the page bottom.
 *
 * Used for ALL AI interactions on the CV page:
 *  - Input forms (optimize for job, cover letter, translate)
 *  - Result review with Accept / Reject (improve summary, suggested skills)
 *  - Read-only results (ATS score, optimization analysis)
 *
 * Design: glass-morphism card, smooth spring animation, backdrop overlay.
 */

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import {
  X,
  Check,
  Copy,
  Loader2,
  Wand2,
  Brain,
  Target,
  FileText,
  Zap,
  Globe,
  Plus,
  Sparkles,
  ChevronUp,
  Upload,
  UploadCloud,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { CVData } from "./types";

// ===================================================================
// TYPES
// ===================================================================

export type DrawerView =
  | null
  | "improveSummary" // Input -> show proposal
  | "suggestSkills" // Show suggested skills
  | "optimizeForJob" // Input form -> show job analysis
  | "coverLetter" // Input form -> show letter
  | "atsScore" // Show score card
  | "translateCV" // Language picker -> translate
  | "importCV"; // Text/file -> AI parse -> import

export type DrawerPhase = "input" | "loading" | "result";

export interface SuggestedSkill {
  name: string;
  level: string;
  reason: string;
}

export interface ATSResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface DrawerState {
  view: DrawerView;
  phase: DrawerPhase;
  // Results
  improvedSummary?: string;
  originalSummary?: string;
  suggestedSkills?: SuggestedSkill[];
  optimizeResult?: string;
  coverLetterResult?: string;
  atsResult?: ATSResult;
  parsedCVData?: Partial<CVData>;
  // Form states held by parent
}

// ===================================================================
// CONSTANTS
// ===================================================================

const CV_LANGUAGES = [
  { code: "fr", label: "Francais" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Portugues" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
];

const VIEW_CONFIG: Record<
  NonNullable<DrawerView>,
  { title: string; icon: typeof Wand2; color: string }
> = {
  improveSummary: {
    title: "icv.ai.improveProfile",
    icon: Wand2,
    color: "text-violet-500",
  },
  suggestSkills: {
    title: "icv.ai.suggestSkills",
    icon: Brain,
    color: "text-emerald-500",
  },
  optimizeForJob: {
    title: "icv.ai.optimizeJob",
    icon: Target,
    color: "text-blue-500",
  },
  coverLetter: {
    title: "icv.ai.coverLetter",
    icon: FileText,
    color: "text-orange-500",
  },
  atsScore: { title: "icv.ai.atsScore", icon: Zap, color: "text-amber-500" },
  translateCV: {
    title: "icv.ai.translateCV",
    icon: Globe,
    color: "text-sky-500",
  },
  importCV: {
    title: "icv.ai.importCV",
    icon: Upload,
    color: "text-teal-500",
  },
};

// ===================================================================
// MAIN COMPONENT
// ===================================================================

interface CVAIDrawerProps {
  state: DrawerState;
  t: TFunction;
  // Callbacks
  onClose: () => void;
  onAcceptSummary: (summary: string) => void;
  onAcceptSkill: (name: string, level: string) => void;
  onAcceptTranslation: () => void;
  onAcceptImport: (data: Partial<CVData>) => void;
  // Trigger actions
  onRunImproveSummary: () => void;
  onRunSuggestSkills: () => void;
  onRunOptimizeForJob: (jobDescription: string) => void;
  onRunGenerateCoverLetter: (data: {
    job: string;
    company: string;
    style: string;
    extra: string;
  }) => void;
  onRunATSScore: () => void;
  onRunTranslateCV: (lang: string) => void;
  onRunImportCV: (data: { text?: string; file?: File }) => void;
}

export function CVAIDrawer({
  state,
  t,
  onClose,
  onAcceptSummary,
  onAcceptSkill,
  onAcceptTranslation,
  onAcceptImport,
  onRunImproveSummary,
  onRunSuggestSkills,
  onRunOptimizeForJob,
  onRunGenerateCoverLetter,
  onRunATSScore,
  onRunTranslateCV,
  onRunImportCV,
}: CVAIDrawerProps) {
  const isOpen = state.view !== null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[91] max-h-[85vh] flex flex-col"
          >
            {/* Glass container */}
            <div className="mx-auto w-full max-w-2xl bg-background/95 backdrop-blur-xl border border-border/50 rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Handle + Header */}
              <div className="flex flex-col items-center pt-3 pb-2 px-5 border-b border-border/30">
                {/* Drag handle */}
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-3" />

                {/* Title bar */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    {state.view && (
                      <>
                        {(() => {
                          const cfg = VIEW_CONFIG[state.view];
                          const Icon = cfg.icon;
                          return (
                            <>
                              <div
                                className={`p-1.5 rounded-lg bg-muted/50 ${cfg.color}`}
                              >
                                <Icon size={16} />
                              </div>
                              <h3 className="font-semibold text-sm">
                                {t(cfg.title)}
                              </h3>
                            </>
                          );
                        })()}
                      </>
                    )}
                    {state.phase === "loading" && (
                      <Loader2
                        className="animate-spin text-muted-foreground ml-1"
                        size={14}
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={onClose}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>

              {/* Content -- scrollable */}
              <div className="flex-1 overflow-y-auto p-5">
                {state.view && (
                  <DrawerContent
                    state={state}
                    t={t}
                    onClose={onClose}
                    onAcceptSummary={onAcceptSummary}
                    onAcceptSkill={onAcceptSkill}
                    onAcceptTranslation={onAcceptTranslation}
                    onAcceptImport={onAcceptImport}
                    onRunImproveSummary={onRunImproveSummary}
                    onRunSuggestSkills={onRunSuggestSkills}
                    onRunOptimizeForJob={onRunOptimizeForJob}
                    onRunGenerateCoverLetter={onRunGenerateCoverLetter}
                    onRunATSScore={onRunATSScore}
                    onRunTranslateCV={onRunTranslateCV}
                    onRunImportCV={onRunImportCV}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ===================================================================
// DRAWER CONTENT ROUTER
// ===================================================================

function DrawerContent(props: CVAIDrawerProps & { state: DrawerState }) {
  const { state } = props;

  switch (state.view) {
    case "improveSummary":
      return <ImproveSummaryView {...props} />;
    case "suggestSkills":
      return <SuggestSkillsView {...props} />;
    case "optimizeForJob":
      return <OptimizeForJobView {...props} />;
    case "coverLetter":
      return <CoverLetterView {...props} />;
    case "atsScore":
      return <ATSScoreView {...props} />;
    case "translateCV":
      return <TranslateCVView {...props} />;
    case "importCV":
      return <ImportCVView {...props} />;
    default:
      return null;
  }
}

// ===================================================================
// IMPROVE SUMMARY VIEW
// ===================================================================

function ImproveSummaryView({
  state,
  t,
  onClose,
  onAcceptSummary,
  onRunImproveSummary,
}: CVAIDrawerProps & { state: DrawerState }) {
  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t("icv.ai.drawer.analyzing")}
      />
    );
  }

  if (state.phase === "result" && state.improvedSummary) {
    return (
      <div className="space-y-4">
        {/* Before / After comparison */}
        {state.originalSummary && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("icv.ai.drawer.before")}
            </p>
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed line-through decoration-red-400/40">
              {state.originalSummary}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles size={12} />
            {t("icv.ai.drawer.proposed")}
          </p>
          <div className="text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 leading-relaxed">
            {state.improvedSummary}
          </div>
        </div>

        {/* Accept / Reject */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={() => {
              onAcceptSummary(state.improvedSummary!);
              onClose();
            }}
          >
            <Check size={15} className="mr-1.5" />
            {t("icv.ai.drawer.accept")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X size={15} className="mr-1.5" />
            {t("icv.ai.drawer.reject")}
          </Button>
        </div>
      </div>
    );
  }

  // Input phase -- just a trigger button
  return (
    <div className="space-y-4 text-center py-4">
      <div className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.improveSummaryDesc",
          "L'IA va analyser votre CV et proposer un resume professionnel ameliore.",
        )}
      </div>
      <Button onClick={onRunImproveSummary} className="mx-auto">
        <Wand2 size={15} className="mr-1.5" />
        {t("icv.ai.drawer.generate")}
      </Button>
    </div>
  );
}

// ===================================================================
// SUGGEST SKILLS VIEW
// ===================================================================

function SuggestSkillsView({
  state,
  t,
  onClose,
  onAcceptSkill,
  onRunSuggestSkills,
}: CVAIDrawerProps & { state: DrawerState }) {
  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t(
          "icv.ai.drawer.findingSkills",
          "Recherche de competences...",
        )}
      />
    );
  }

  if (state.phase === "result" && state.suggestedSkills) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t(
            "icv.ai.drawer.suggestedSkillsDesc",
            "Competences suggerees basees sur votre experience",
          )}
        </p>

        <div className="space-y-2">
          {state.suggestedSkills.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {s.level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.reason}
                </p>
              </div>
              <button
                onClick={() => onAcceptSkill(s.name, s.level)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground
                  transition-all border border-primary/20 hover:border-primary`}
              >
                <Plus size={13} />
                {t("icv.ai.drawer.addSkill")}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("icv.ai.drawer.done")}
          </Button>
        </div>
      </div>
    );
  }

  // Input phase
  return (
    <div className="space-y-4 text-center py-4">
      <div className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.suggestSkillsDesc2",
          "L'IA va analyser vos experiences et suggerer des competences pertinentes a ajouter.",
        )}
      </div>
      <Button onClick={onRunSuggestSkills} className="mx-auto">
        <Brain size={15} className="mr-1.5" />
        {t("icv.ai.drawer.findSkills")}
      </Button>
    </div>
  );
}

// ===================================================================
// OPTIMIZE FOR JOB VIEW
// ===================================================================

function OptimizeForJobView({
  state,
  t,
  onClose,
  onRunOptimizeForJob,
}: CVAIDrawerProps & { state: DrawerState }) {
  const [jobDesc, setJobDesc] = useState("");

  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t("icv.ai.drawer.optimizing")}
      />
    );
  }

  if (state.phase === "result" && state.optimizeResult) {
    // Parse optimizeResult (JSON string)
    let parsed: {
      overallScore?: number;
      matchingKeywords?: string[];
      missingKeywords?: string[];
      suggestions?: string[];
      optimizedSummary?: string;
    } = {};
    try {
      parsed = JSON.parse(state.optimizeResult);
    } catch {
      // fallback -- just show raw text
    }

    return (
      <div className="space-y-4">
        {/* Score */}
        {parsed.overallScore !== undefined && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
            <div
              className={`text-4xl font-bold ${
                parsed.overallScore >= 80 ? "text-green-500"
                : parsed.overallScore >= 60 ? "text-amber-500"
                : "text-red-500"
              }`}
            >
              {parsed.overallScore}
            </div>
            <div>
              <div className="text-sm font-medium">
                {t(
                  "icv.ai.drawer.compatibilityScore",
                  "Score de compatibilite",
                )}
              </div>
              <div className="text-xs text-muted-foreground">/100</div>
            </div>
          </div>
        )}

        {/* Keywords */}
        {parsed.matchingKeywords && parsed.matchingKeywords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-green-600">
               {t("icv.ai.drawer.matchingKeywords")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.matchingKeywords.map((k, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {parsed.missingKeywords && parsed.missingKeywords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-red-600">
               {t("icv.ai.drawer.missingKeywords")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.missingKeywords.map((k, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {parsed.suggestions && parsed.suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-blue-600">
              → {t("icv.ai.drawer.suggestions")}
            </p>
            <ul className="space-y-1">
              {parsed.suggestions.map((s, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <span className="shrink-0 mt-0.5">-</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimized summary */}
        {parsed.optimizedSummary && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-violet-600 flex items-center gap-1.5">
              <Sparkles size={12} />
              {t("icv.ai.drawer.optimizedSummary")}
            </p>
            <div className="text-sm bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 leading-relaxed">
              {parsed.optimizedSummary}
            </div>
          </div>
        )}

        {/* Raw fallback */}
        {!parsed.overallScore && (
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
            {state.optimizeResult}
          </pre>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(state.optimizeResult || "");
              toast.success(t("icv.ai.copied"));
            }}
          >
            <Copy size={14} className="mr-1.5" />
            {t("icv.ai.copy")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("icv.ai.drawer.done")}
          </Button>
        </div>
      </div>
    );
  }

  // Input phase
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.optimizeDesc",
          "Collez la description du poste cible pour analyser la compatibilite de votre CV.",
        )}
      </p>
      <Textarea
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
        placeholder={t(
          "icv.ai.jobDescPlaceholder",
          "Collez la description du poste ou l'URL de l'offre...",
        )}
        className="min-h-[120px] text-sm"
      />
      <Button
        className="w-full"
        onClick={() => onRunOptimizeForJob(jobDesc)}
        disabled={!jobDesc.trim()}
      >
        <Target size={15} className="mr-1.5" />
        {t("icv.ai.analyzeBtn")}
      </Button>
    </div>
  );
}

// ===================================================================
// COVER LETTER VIEW
// ===================================================================

function CoverLetterView({
  state,
  t,
  onClose,
  onRunGenerateCoverLetter,
}: CVAIDrawerProps & { state: DrawerState }) {
  const [job, setJob] = useState("");
  const [company, setCompany] = useState("");
  const [style, setStyle] = useState("formal");
  const [extra, setExtra] = useState("");

  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t("icv.ai.drawer.writing")}
      />
    );
  }

  if (state.phase === "result" && state.coverLetterResult) {
    return (
      <div className="space-y-4">
        <div className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-lg p-4 max-h-[50vh] overflow-y-auto border">
          {state.coverLetterResult}
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(state.coverLetterResult || "");
              toast.success(t("icv.ai.copied"));
            }}
          >
            <Copy size={14} className="mr-1.5" />
            {t("icv.ai.copy")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("icv.ai.drawer.done")}
          </Button>
        </div>
      </div>
    );
  }

  // Input phase
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.coverLetterDesc",
          "Renseignez les informations pour generer une lettre de motivation personnalisee.",
        )}
      </p>
      <div className="space-y-2.5">
        <Input
          value={job}
          onChange={(e) => setJob(e.target.value)}
          placeholder={t("icv.ai.clJobPlaceholder")}
          className="text-sm"
        />
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder={t("icv.ai.clCompanyPlaceholder")}
          className="text-sm"
        />
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="formal">
              {t("icv.ai.styleFormal")}
            </SelectItem>
            <SelectItem value="modern">
              {t("icv.ai.styleModern")}
            </SelectItem>
            <SelectItem value="creative">
              {t("icv.ai.styleCreative")}
            </SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={t(
            "icv.ai.clExtraPlaceholder",
            "Infos supplementaires (optionnel)",
          )}
          className="text-sm min-h-[60px]"
        />
      </div>
      <Button
        className="w-full"
        onClick={() => onRunGenerateCoverLetter({ job, company, style, extra })}
        disabled={!job.trim() || !company.trim()}
      >
        <FileText size={15} className="mr-1.5" />
        {t("icv.ai.generateBtn")}
      </Button>
    </div>
  );
}

// ===================================================================
// ATS SCORE VIEW
// ===================================================================

function ATSScoreView({
  state,
  t,
  onClose,
  onRunATSScore,
}: CVAIDrawerProps & { state: DrawerState }) {
  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t("icv.ai.drawer.scoring")}
      />
    );
  }

  if (state.phase === "result" && state.atsResult) {
    const { score, strengths, weaknesses, recommendations } = state.atsResult;
    return (
      <div className="space-y-4">
        {/* Score ring */}
        <div className="flex items-center gap-5 p-5 rounded-xl bg-muted/30">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                strokeWidth="6"
                fill="none"
                className="stroke-muted"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="34"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                className={
                  score >= 80 ? "stroke-green-500"
                  : score >= 60 ?
                    "stroke-amber-500"
                  : "stroke-red-500"
                }
                initial={{ strokeDasharray: `0 ${2 * Math.PI * 34}` }}
                animate={{
                  strokeDasharray: `${(score / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`,
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-2xl font-bold ${
                  score >= 80 ? "text-green-500"
                  : score >= 60 ? "text-amber-500"
                  : "text-red-500"
                }`}
              >
                {score}
              </span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm">
              {t("icv.ai.drawer.atsCompatibility")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {score >= 80 ?
                t(
                  "icv.ai.drawer.atsExcellent",
                  "Excellent ! Votre CV est bien optimise.",
                )
              : score >= 60 ?
                t(
                  "icv.ai.drawer.atsGood",
                  "Correct, mais quelques ameliorations possibles.",
                )
              : t(
                  "icv.ai.drawer.atsNeedsWork",
                  "Des ameliorations sont necessaires.",
                )
              }
            </p>
          </div>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <Section
            title={t("icv.ai.drawer.strengths")}
            items={strengths}
            color="green"
            icon=""
          />
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <Section
            title={t("icv.ai.drawer.weaknesses")}
            items={weaknesses}
            color="red"
            icon=""
          />
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Section
            title={t("icv.ai.drawer.recommendations")}
            items={recommendations}
            color="blue"
            icon="->"
          />
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          {t("icv.ai.drawer.done")}
        </Button>
      </div>
    );
  }

  // Input -- just trigger
  return (
    <div className="space-y-4 text-center py-4">
      <div className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.atsDesc",
          "Analysez la compatibilite de votre CV avec les systemes de suivi des candidatures (ATS).",
        )}
      </div>
      <Button onClick={onRunATSScore} className="mx-auto">
        <Zap size={15} className="mr-1.5" />
        {t("icv.ai.drawer.runAnalysis")}
      </Button>
    </div>
  );
}

// ===================================================================
// TRANSLATE VIEW
// ===================================================================

function TranslateCVView({
  state,
  t,
  onClose,
  onAcceptTranslation,
  onRunTranslateCV,
}: CVAIDrawerProps & { state: DrawerState }) {
  const [lang, setLang] = useState("en");

  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t("icv.ai.drawer.translating")}
      />
    );
  }

  if (state.phase === "result") {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
          <Check className="mx-auto text-emerald-500 mb-2" size={24} />
          <p className="text-sm font-medium">
            {t("icv.ai.drawer.translationReady")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "icv.ai.drawer.translationReadyDesc",
              "Votre CV a ete traduit. Voulez-vous appliquer les modifications ?",
            )}
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={() => {
              onAcceptTranslation();
              onClose();
            }}
          >
            <Check size={15} className="mr-1.5" />
            {t("icv.ai.drawer.applyTranslation")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X size={15} className="mr-1.5" />
            {t("icv.ai.drawer.reject")}
          </Button>
        </div>
      </div>
    );
  }

  // Input -- language picker
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.translateDesc",
          "Choisissez la langue de destination pour traduire votre CV.",
        )}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {CV_LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`text-sm py-2.5 px-3 rounded-lg border text-center transition-all ${
              lang === l.code ?
                "border-primary bg-primary/5 text-primary font-medium"
              : "border-border hover:bg-muted/50"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <Button className="w-full" onClick={() => onRunTranslateCV(lang)}>
        <Globe size={15} className="mr-1.5" />
        {t("icv.ai.drawer.startTranslation")}
      </Button>
    </div>
  );
}

// ===================================================================
// IMPORT CV VIEW
// ===================================================================

function ImportCVView({
  state,
  t,
  onClose,
  onAcceptImport,
  onRunImportCV,
}: CVAIDrawerProps & { state: DrawerState }) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = { current: null as HTMLInputElement | null };

  if (state.phase === "loading") {
    return (
      <LoadingState
        message={t(
          "icv.ai.drawer.import.scanning",
          "Analyse du CV en cours...",
        )}
      />
    );
  }

  if (state.phase === "result" && state.parsedCVData) {
    const d = state.parsedCVData;
    return (
      <div className="space-y-4">
        {/* Summary of extracted data */}
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-emerald-500" size={16} />
            <p className="text-sm font-semibold">
              {t("icv.ai.drawer.import.dataExtracted")}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {/* Identity */}
            {(d.firstName || d.lastName) && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-24 shrink-0">
                  {t("icv.form.personalInfo")}
                </span>
                <span>
                  {d.firstName} {d.lastName}
                  {d.title ? ` -- ${d.title}` : ""}
                </span>
              </div>
            )}

            {/* Summary */}
            {d.summary && (
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground w-24 shrink-0">
                  {t("icv.form.summary")}
                </span>
                <span className="line-clamp-2">{d.summary}</span>
              </div>
            )}

            {/* Experiences */}
            {d.experiences && d.experiences.length > 0 && (
              <div className="flex items-center gap-2">
                <Briefcase
                  size={13}
                  className="text-muted-foreground shrink-0"
                />
                <span>
                  {d.experiences.length}{" "}
                  {t("icv.form.experiences")}
                </span>
              </div>
            )}

            {/* Education */}
            {d.education && d.education.length > 0 && (
              <div className="flex items-center gap-2">
                <GraduationCap
                  size={13}
                  className="text-muted-foreground shrink-0"
                />
                <span>
                  {d.education.length} {t("icv.form.education")}
                </span>
              </div>
            )}

            {/* Skills */}
            {d.skills && d.skills.length > 0 && (
              <div className="flex items-center gap-2">
                <Award size={13} className="text-muted-foreground shrink-0" />
                <span>
                  {d.skills.length} {t("icv.form.skills")}
                </span>
              </div>
            )}

            {/* Languages */}
            {d.languages && d.languages.length > 0 && (
              <div className="flex items-center gap-2">
                <Languages
                  size={13}
                  className="text-muted-foreground shrink-0"
                />
                <span>
                  {d.languages.length} {t("icv.form.languages")}
                </span>
              </div>
            )}

            {/* Hobbies */}
            {d.hobbies && d.hobbies.length > 0 && (
              <div className="flex items-center gap-2">
                <Heart size={13} className="text-muted-foreground shrink-0" />
                <span>{d.hobbies.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Accept / Reject */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={() => {
              onAcceptImport(state.parsedCVData!);
              onClose();
            }}
          >
            <Check size={15} className="mr-1.5" />
            {t("icv.ai.drawer.accept")}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X size={15} className="mr-1.5" />
            {t("icv.ai.drawer.reject")}
          </Button>
        </div>
      </div>
    );
  }

  // Input phase -- text or file
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "icv.ai.drawer.import.desc",
          "Collez le contenu de votre CV ou chargez un fichier (PDF, image). L'IA extraira automatiquement toutes les donnees.",
        )}
      </p>

      {/* Textarea */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t(
          "icv.ai.drawer.import.pastePlaceholder",
          "Collez le texte de votre CV ici...",
        )}
        className="h-32 text-sm"
      />

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        {t("icv.ai.drawer.import.or")}
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* File upload */}
      <div>
        <input
          ref={(el) => {
            fileInputRef.current = el;
          }}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setSelectedFile(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            transition-colors hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/40`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-muted rounded-full">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
            </div>
            {selectedFile ?
              <div className="text-sm">
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-muted-foreground ml-2">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            : <div className="text-sm text-muted-foreground">
                {t(
                  "icv.ai.drawer.import.dropzone",
                  "Cliquez pour charger un PDF ou une image",
                )}
              </div>
            }
          </div>
        </button>
      </div>

      {/* Action */}
      <Button
        className="w-full"
        disabled={!text.trim() && !selectedFile}
        onClick={() => {
          if (selectedFile) {
            onRunImportCV({ file: selectedFile });
          } else {
            onRunImportCV({ text: text.trim() });
          }
        }}
      >
        <Sparkles size={15} className="mr-1.5" />
        {t("icv.ai.drawer.import.scanBtn")}
      </Button>
    </div>
  );
}

// ===================================================================
// SHARED SUB-COMPONENTS
// ===================================================================

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      >
        <Sparkles className="text-primary" size={28} />
      </motion.div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function Section({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: "green" | "red" | "blue";
  icon: string;
}) {
  const colorMap = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold ${colorMap[color]}`}>
        {icon} {title}
      </p>
      {items.map((item, i) => (
        <p
          key={i}
          className="text-xs text-muted-foreground flex items-start gap-1.5 pl-3"
        >
          <span className="shrink-0 mt-0.5">-</span>
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}

// ===================================================================
// AI BUTTON (used in sidebar)
// ===================================================================

export function AIFeatureButton({
  icon,
  label,
  loading,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium
        hover:bg-muted/80 transition-all disabled:opacity-50 text-left
        border border-transparent hover:border-border/50`}
    >
      <div className={`shrink-0 ${accent || ""}`}>
        {loading ?
          <Loader2 className="animate-spin" size={14} />
        : icon}
      </div>
      <span className="truncate">{label}</span>
      <ChevronUp
        size={12}
        className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100"
      />
    </button>
  );
}
