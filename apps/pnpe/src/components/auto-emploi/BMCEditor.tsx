/**
 * Éditeur Business Model Canvas (9 blocs).
 *
 * Chaque bloc est un éditeur Tiptap riche (gras, italique, listes).
 * Auto-save 2 secondes après la dernière modification. Sauvegarde le
 * contenu HTML par bloc dans `programmesAutoEmploi.businessPlan.contenuJson`.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

const BMC_BLOCS = [
  { key: "partenairesCles", label: "1. Partenaires clés", hint: "Fournisseurs, alliés, prestataires." },
  { key: "activitesCles", label: "2. Activités clés", hint: "Ce que vous faites au quotidien." },
  { key: "ressourcesCles", label: "3. Ressources clés", hint: "Humaines, matérielles, financières." },
  { key: "propositionValeur", label: "4. Proposition de valeur", hint: "Pourquoi vos clients choisiront vous." },
  { key: "relationClient", label: "5. Relation client", hint: "Type de relation à entretenir." },
  { key: "canauxDistribution", label: "6. Canaux de distribution", hint: "Comment vous atteignez vos clients." },
  { key: "segmentsClients", label: "7. Segments de clients", hint: "Qui sont vos clients cibles." },
  { key: "structureCouts", label: "8. Structure de coûts", hint: "Vos principales charges." },
  { key: "fluxRevenus", label: "9. Flux de revenus", hint: "Comment vous gagnerez de l'argent." },
] as const;

type BMCBlocKey = (typeof BMC_BLOCS)[number]["key"];
type BMCContent = Record<BMCBlocKey, string>;

const emptyContent: BMCContent = BMC_BLOCS.reduce(
  (acc, b) => ({ ...acc, [b.key]: "" }),
  {} as BMCContent,
);

function BlocToolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  if (!editor) return null;
  return (
    <div className="flex gap-1 mb-1 border-b pb-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-muted ${
          editor.isActive("bold") ? "bg-muted" : ""
        }`}
        aria-label="Gras"
      >
        <Bold className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-muted ${
          editor.isActive("italic") ? "bg-muted" : ""
        }`}
        aria-label="Italique"
      >
        <Italic className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-muted ${
          editor.isActive("bulletList") ? "bg-muted" : ""
        }`}
        aria-label="Liste à puces"
      >
        <List className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-muted ${
          editor.isActive("orderedList") ? "bg-muted" : ""
        }`}
        aria-label="Liste numérotée"
      >
        <ListOrdered className="size-3.5" />
      </button>
    </div>
  );
}

function BMCBloc({
  label,
  hint,
  initialContent,
  onChange,
}: {
  label: string;
  hint: string;
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || "",
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[120px] text-sm",
      },
    },
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <label className="font-semibold text-sm block">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{hint}</p>
      <BlocToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function BMCEditor({
  programmeId,
  initialContent,
  initialVersion,
}: {
  programmeId: string;
  initialContent?: Partial<BMCContent>;
  initialVersion?: number;
}) {
  const [content, setContent] = useState<BMCContent>({
    ...emptyContent,
    ...(initialContent ?? {}),
  });
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // @ts-expect-error — api.pnpe typé après codegen
  const update = useMutation(api.pnpe?.autoEmploi?.updateBusinessPlan);

  const save = useCallback(
    async (next: BMCContent) => {
      setSaving(true);
      try {
        await update({ programmeId, contenuJson: next });
        setLastSaved(Date.now());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      } finally {
        setSaving(false);
      }
    },
    [update, programmeId],
  );

  const onBlocChange = useCallback(
    (key: BMCBlocKey, html: string) => {
      setContent((prev) => {
        const next = { ...prev, [key]: html };
        // Auto-save debounced 2s
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => save(next), 2000);
        return next;
      });
    },
    [save],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end text-xs text-muted-foreground gap-3">
        {initialVersion != null && <span>Version {initialVersion}</span>}
        {saving ? (
          <span>Enregistrement…</span>
        ) : lastSaved ? (
          <span className="text-emerald-600">
            ✓ Sauvegardé{" "}
            {new Date(lastSaved).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : (
          <span>Non sauvegardé</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BMC_BLOCS.map((b) => (
          <BMCBloc
            key={b.key}
            label={b.label}
            hint={b.hint}
            initialContent={content[b.key]}
            onChange={(html) => onBlocChange(b.key, html)}
          />
        ))}
      </div>
    </div>
  );
}
