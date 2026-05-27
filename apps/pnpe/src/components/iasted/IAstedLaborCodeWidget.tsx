/**
 * Widget iAsted Emploi — Q&A code du travail gabonais.
 *
 * Branche `api.functions.pnpe.iastedEmploi.explainLaborCode` pour
 * répondre aux questions juridiques basiques (embauche, rupture,
 * congés, salaires, maternité, apprentissage).
 *
 * À placer dans une sidebar ou un drawer flottant accessible à tous
 * les rôles PNPE. Le rate-limit éventuel est géré côté Convex.
 */
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Loader2, Sparkles, Scale } from "lucide-react";
import { api } from "@convex/_generated/api";

const CONTEXTS = [
  { value: "embauche", label: "Embauche" },
  { value: "rupture", label: "Rupture" },
  { value: "conges", label: "Congés" },
  { value: "salaires", label: "Salaires" },
  { value: "maternite", label: "Maternité" },
  { value: "apprentissage", label: "Apprentissage" },
] as const;

type ContextValue = (typeof CONTEXTS)[number]["value"];

export function IAstedLaborCodeWidget() {
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [contexte, setContexte] = useState<ContextValue | "">("");

  const answer = useQuery(
    api.functions.pnpe.iastedEmploi.explainLaborCode,
    submittedQuestion
      ? {
          question: submittedQuestion,
          contexte: contexte || undefined,
        }
      : "skip",
  );

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Scale className="size-4 text-emerald-600" />
        iAsted — Code du travail
      </div>
      <p className="text-xs text-muted-foreground">
        Pose une question simple (ex : « Combien de jours de congés payés ? »).
        Réponses indicatives basées sur la FAQ du code du travail gabonais.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CONTEXTS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() =>
              setContexte((cur) => (cur === c.value ? "" : c.value))
            }
            className={[
              "text-xs rounded-full border px-2 py-0.5 transition-colors",
              contexte === c.value
                ? "bg-emerald-600 text-white border-emerald-600"
                : "hover:bg-muted",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 5) {
            setSubmittedQuestion(question.trim());
          }
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Votre question…"
          className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={question.trim().length < 5}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Sparkles className="size-3.5" />
          Demander
        </button>
      </form>
      {submittedQuestion && (
        <div className="rounded-lg border bg-background p-3 text-sm">
          {answer === undefined ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Recherche en cours…
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {answer.reponse}
              </p>
              {answer.articlesCites.length > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Articles cités : {answer.articlesCites.join(", ")}
                </p>
              )}
              <p className="text-[11px] italic text-muted-foreground pt-1">
                {answer.avertissement}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
