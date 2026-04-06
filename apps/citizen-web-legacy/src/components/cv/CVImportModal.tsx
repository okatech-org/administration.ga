import { useState } from "react";
import { Upload, FileJson, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CVData } from "./types";

interface CVImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: Partial<CVData>) => void;
}

export function CVImportModal({ open, onClose, onImport }: CVImportModalProps) {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");

  const handleImportJSON = () => {
    try {
      setError("");
      const parsed = JSON.parse(jsonText);

      // Basic validation
      const cv: Partial<CVData> = {
        firstName: parsed.firstName || parsed.first_name || "",
        lastName: parsed.lastName || parsed.last_name || "",
        title: parsed.title || parsed.headline || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        address: parsed.address || parsed.location || "",
        summary: parsed.summary || parsed.about || "",
        experiences: (parsed.experiences || parsed.positions || []).map(
          (exp: Record<string, string | boolean>) => ({
            title: exp.title || "",
            company: exp.company || exp.companyName || "",
            location: exp.location || "",
            startDate: exp.startDate || exp.start_date || "",
            endDate: exp.endDate || exp.end_date || "",
            current: exp.current ?? false,
            description: exp.description || "",
          }),
        ),
        education: (parsed.education || []).map(
          (edu: Record<string, string | boolean>) => ({
            degree: edu.degree || edu.fieldOfStudy || "",
            school: edu.school || edu.institution || "",
            location: edu.location || "",
            startDate: edu.startDate || edu.start_date || "",
            endDate: edu.endDate || edu.end_date || "",
            current: edu.current ?? false,
          }),
        ),
        skills: (parsed.skills || []).map(
          (s: string | { name: string; level?: string }) =>
            typeof s === "string" ?
              { name: s, level: "Intermediate" }
            : { name: s.name, level: s.level || "Intermediate" },
        ),
        languages: (parsed.languages || []).map(
          (l: string | { name: string; level?: string }) =>
            typeof l === "string" ?
              { name: l, level: "Intermediate" }
            : { name: l.name, level: l.level || "Intermediate" },
        ),
      };

      onImport(cv);
      setJsonText("");
      onClose();
    } catch {
      setError(
        t(
          "icv.import.invalidJSON",
          "Format JSON invalide. Veuillez vérifier votre fichier.",
        ),
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            {t("icv.import.title")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "icv.import.description",
              "Importez vos données depuis un fichier JSON ou collez-les directement.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FileJson size={16} />
              {t("icv.import.uploadFile")}
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* JSON textarea */}
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={t(
              "icv.import.placeholder",
              '{"firstName": "Jean", "lastName": "Dupont", ...}',
            )}
            className="h-48 font-mono text-xs"
          />

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <X size={14} />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleImportJSON} disabled={!jsonText.trim()}>
              {t("icv.import.import")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
