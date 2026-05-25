/**
 * Page CV du Demandeur d'Emploi — upload PDF via Convex storage.
 *
 * Flow :
 *   1. `generateCvUploadUrl` (authMutation) retourne une URL signée
 *   2. Client POST le fichier directement sur l'URL → reçoit storageId
 *   3. `attachCv` (authMutation) lie storageId au profil D.E
 *   4. `getCvUrl` retourne une URL d'accès pour la visualisation
 */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Download, FileText, Upload } from "lucide-react";
import { api } from "@workspace/api/convex/_generated/api";

const MAX_SIZE_MB = 5;

export default function CvPage() {
  const [uploading, setUploading] = useState(false);
  // @ts-expect-error — api.pnpe typé après codegen
  const demandeur = useQuery(api.pnpe?.demandeurs?.getMine);
  // @ts-expect-error
  const cvUrl = useQuery(
    demandeur?._id ? api.pnpe?.demandeurs?.getCvUrl : "skip",
    demandeur?._id ? { demandeurId: demandeur._id } : "skip",
  );
  // @ts-expect-error
  const generateUrl = useMutation(api.pnpe?.demandeurs?.generateCvUploadUrl);
  // @ts-expect-error
  const attach = useMutation(api.pnpe?.demandeurs?.attachCv);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Format PDF uniquement.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Taille max : ${MAX_SIZE_MB} MB`);
      return;
    }
    if (!demandeur) {
      toast.error("Inscrivez-vous d'abord.");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await attach({ demandeurId: demandeur._id, cvStorageId: storageId });
      toast.success("CV enregistré.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
    }
  };

  if (demandeur === undefined) {
    return <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />;
  }
  if (!demandeur) {
    return (
      <p className="text-muted-foreground">
        Inscrivez-vous comme D.E avant de gérer votre CV.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Mon CV
        </h1>
        <p className="text-muted-foreground mt-1">
          Téléversez votre CV au format PDF (max {MAX_SIZE_MB} MB).
        </p>
      </div>

      {demandeur.cvStorageId && cvUrl ? (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="size-6 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">CV enregistré</div>
              <p className="text-xs text-muted-foreground mt-1">
                Votre CV est associé à votre profil. Visible par les conseillers
                PNPE et les employeurs lors d'une candidature.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Download className="size-3.5" />
              Télécharger
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed bg-card p-12 text-center">
          <Upload className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Aucun CV téléversé pour le moment.
          </p>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium block mb-2">
          {demandeur.cvStorageId ? "Remplacer le CV" : "Téléverser le CV"}
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={onUpload}
          disabled={uploading}
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
        />
        {uploading && (
          <p className="text-xs text-muted-foreground mt-2">Upload en cours…</p>
        )}
      </label>
    </div>
  );
}
