/**
 * AIActionPanel — Panneau modal pour les actions IA
 *
 * Pattern réutilisable : formulaire d'input → loading → résultat
 * Utilisé pour toutes les phases du pipeline diplomatique.
 */

import { Loader2, Sparkles, RefreshCw, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AIActionState = "idle" | "loading" | "result" | "error";

interface AIActionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon?: React.ElementType;
  // Formulaire d'input
  inputForm: ReactNode;
  // Résultat IA
  resultView?: ReactNode;
  // État
  state: AIActionState;
  errorMessage?: string;
  // Actions
  onSubmit: () => void;
  onValidate?: () => void;
  onRegenerate?: () => void;
  submitLabel?: string;
  validateLabel?: string;
  loadingMessage?: string;
}

export function AIActionPanel({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon = Sparkles,
  inputForm,
  resultView,
  state,
  errorMessage,
  onSubmit,
  onValidate,
  onRegenerate,
  submitLabel = "Lancer l'IA",
  validateLabel = "Valider et enregistrer",
  loadingMessage = "L'IA analyse et génère les résultats...",
}: AIActionPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Formulaire d'input */}
          {(state === "idle" || state === "error") && (
            <>
              {inputForm}
              {state === "error" && errorMessage && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button onClick={onSubmit} className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {submitLabel}
                </Button>
              </div>
            </>
          )}

          {/* État loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <Loader2 className="h-6 w-6 text-primary animate-spin absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{loadingMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cela peut prendre quelques secondes...
                </p>
              </div>
            </div>
          )}

          {/* Résultat */}
          {state === "result" && resultView && (
            <>
              {resultView}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={onRegenerate}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Régénérer
                </Button>
                <Button onClick={onValidate} className="gap-1.5">
                  <Check className="h-4 w-4" />
                  {validateLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bouton déclencheur pour les actions IA
 */
export function AIActionButton({
  label,
  icon: Icon = Sparkles,
  onClick,
  disabled,
  variant = "default",
  className,
}: {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={cn("gap-1.5", className)}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}
