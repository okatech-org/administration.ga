#!/usr/bin/env bun
/**
 * DÉSAFFECTÉ — 2026-04-17
 *
 * Les 25 modèles diplomatiques sont désormais intégrés directement dans
 * `seedDefaultTemplates` (convex/functions/documentTemplates.ts). Plus
 * besoin de ce script externe : relancer `seedDefaultTemplates` depuis le
 * dashboard Convex (ou un autre endroit qui l'appelle déjà) insère les 25
 * modèles en une seule opération idempotente.
 *
 * Pour régénérer le fichier source `convex/migrations/seedDiplomaticTemplatesData.ts`
 * à partir des DOCX de référence :
 *     python3 scripts/generate_diplomatic_seed.py
 */
console.error(
	"Ce script est désaffecté. Appelle plutôt `functions/documentTemplates:seedDefaultTemplates` depuis le dashboard Convex.",
);
process.exit(1);
