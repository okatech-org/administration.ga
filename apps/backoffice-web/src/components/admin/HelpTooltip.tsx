"use client";

/**
 * HelpTooltip — Tooltip pédagogique réutilisable (Phase C4)
 *
 * Affiche une icône <HelpCircle> qui révèle un contenu d'aide au survol/clic.
 *
 * Usage :
 *   import { HELP } from "@/lib/help-content";
 *   <HelpTooltip content={HELP.calls.ringTimeout} />
 *
 *   ou directement avec une string :
 *   <HelpTooltip content="Texte d'aide simple" />
 */

import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface HelpTooltipProps {
  /** Contenu : soit string simple, soit objet { fr, en } pour i18n */
  content: string | { fr: string; en: string };
  /** Side du tooltip (défaut: "top") */
  side?: "top" | "right" | "bottom" | "left";
  /** Taille de l'icône (défaut: 14px) */
  size?: number;
  className?: string;
}

export function HelpTooltip({
  content,
  side = "top",
  size = 14,
  className,
}: HelpTooltipProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "fr" ? "fr" : "en";

  const text = typeof content === "string" ? content : content[lang] ?? content.fr;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-help",
              className,
            )}
            aria-label="Aide"
          >
            <HelpCircle style={{ width: size, height: size }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
