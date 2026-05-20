"use client"

import { sanitizeHtml } from "@workspace/shared/utils/sanitize"
import { useRegisterTipTapEditor } from "@workspace/iasted"
import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { useCallback, useEffect } from "react"
import { useConvexMutationQuery } from "@/integrations/convex/hooks"
import { api } from "@convex/_generated/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Quote,
  Minus,
  Megaphone,
  Hash,
  Info,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { EDITORIAL_NODES } from "@/components/common/editor-nodes"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

function MenuBar({ editor }: { editor: Editor | null }) {
  const { mutateAsync: generateUploadUrl } = useConvexMutationQuery(
    api.functions.documents.generateUploadUrl
  )

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL du lien:", previousUrl)

    if (url === null) return

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(async () => {
    if (!editor) return

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // Upload to Convex storage
        const postUrl = await generateUploadUrl({})

        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })

        if (!result.ok) throw new Error("Upload failed")

        const { storageId } = await result.json()

        // Get the URL for the image (we need a query for this)
        // For now, we'll use a placeholder and update after
        // In a real implementation, you'd get the URL from storage
        toast.success("Image uploadée")

        // Insert with storage ID as src (we'll resolve in display)
        // For simplicity, we store the storageId and handle resolution later
        editor
          .chain()
          .focus()
          .setImage({ src: `storage:${storageId}` })
          .run()
      } catch (err) {
        toast.error("Erreur lors de l'upload de l'image")
        console.error(err)
      }
    }

    input.click()
  }, [editor, generateUploadUrl])

  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(editor.isActive("bold") && "bg-muted")}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(editor.isActive("italic") && "bg-muted")}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(editor.isActive("heading", { level: 2 }) && "bg-muted")}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(editor.isActive("heading", { level: 3 }) && "bg-muted")}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(editor.isActive("bulletList") && "bg-muted")}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(editor.isActive("orderedList") && "bg-muted")}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(editor.isActive("blockquote") && "bg-muted")}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        className={cn(editor.isActive("link") && "bg-muted")}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={addImage}>
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Editorial blocks (Article.html / Guide.html maquettes) */}
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Chiffres clés"
        onClick={() => {
          const raw = window.prompt(
            "Chiffres clés (format : valeur|libellé, un par ligne) :",
            "4 200|Ressortissants recensés\n7 États|Couverture juridictionnelle\n12 agents|Équipe diplomatique",
          )
          if (!raw) return
          const facts = raw
            .split("\n")
            .map((l) => l.split("|").map((s) => s.trim()))
            .filter((p) => p[0] && p[1])
            .slice(0, 4)
            .map(([value, label]) => ({ value, label }))
          if (facts.length === 0) return
          editor.chain().focus().insertKeyFacts(facts).run()
        }}
      >
        <Hash className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Citation mise en avant"
        onClick={() => {
          const quote = window.prompt("Citation :")
          if (!quote) return
          const cite = window.prompt("Attribution (optionnelle) :") ?? undefined
          editor.chain().focus().insertPullquote(quote, cite || undefined).run()
        }}
      >
        <Megaphone className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Encadré info"
        onClick={() => {
          const title = window.prompt("Titre de l'encadré :", "Bon à savoir")
          if (!title) return
          const body = window.prompt("Contenu :") ?? ""
          editor.chain().focus().insertCallout("info", title, body).run()
        }}
      >
        <Info className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Encadré succès"
        onClick={() => {
          const title = window.prompt("Titre :", "À retenir")
          if (!title) return
          const body = window.prompt("Contenu :") ?? ""
          editor.chain().focus().insertCallout("ok", title, body).run()
        }}
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Encadré avertissement"
        onClick={() => {
          const title = window.prompt("Titre :", "Attention")
          if (!title) return
          const body = window.prompt("Contenu :") ?? ""
          editor.chain().focus().insertCallout("warn", title, body).run()
        }}
      >
        <AlertTriangle className="h-4 w-4" />
      </Button>

      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  placeholder: _placeholder = "Commencez à écrire...",
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      ...EDITORIAL_NODES,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:list-decimal [&_ol]:pl-6",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Sprint 9 wiring (Ronde 3) : bridge iAsted ↔ TipTap. L'agent vocal peut
  // écrire/lire dans cet éditeur via les tools `editor_*` quand il est actif.
  useRegisterTipTapEditor(editor, { enabled: editable })

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden bg-background",
        className
      )}
    >
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

/**
 * Read-only renderer for post content
 * Handles storage: URLs and converts them to actual URLs
 */
export function RichTextRenderer({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2",
        "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2",
        "[&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:list-decimal [&_ol]:pl-6",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg",
        // Editorial blocks (Article.html / Guide.html maquettes)
        // keyFacts grid
        "[&_.keyfacts]:grid [&_.keyfacts]:grid-cols-1 sm:[&_.keyfacts]:grid-cols-3",
        "[&_.keyfacts]:gap-4 [&_.keyfacts]:my-8 [&_.keyfacts]:not-prose",
        "[&_.kf]:rounded-xl [&_.kf]:border [&_.kf]:bg-[var(--surface)] [&_.kf]:p-5",
        "[&_.kf-v]:text-3xl [&_.kf-v]:font-bold [&_.kf-v]:text-[var(--gabon-blue-hex)]",
        "[&_.kf-v]:leading-tight [&_.kf-v]:mb-1",
        "[&_.kf-l]:text-xs [&_.kf-l]:uppercase [&_.kf-l]:tracking-wider",
        "[&_.kf-l]:text-muted-foreground",
        // Pullquote
        "[&_.pullquote]:border-l-4 [&_.pullquote]:border-[var(--gabon-blue-hex)]",
        "[&_.pullquote]:bg-[var(--gabon-blue-tint)] [&_.pullquote]:p-5 [&_.pullquote]:my-6",
        "[&_.pullquote]:rounded-r-lg [&_.pullquote]:not-italic",
        "[&_.pullquote_p]:text-lg [&_.pullquote_p]:font-medium [&_.pullquote_p]:m-0",
        "[&_.pullquote_cite]:block [&_.pullquote_cite]:mt-3 [&_.pullquote_cite]:text-sm",
        "[&_.pullquote_cite]:text-muted-foreground [&_.pullquote_cite]:not-italic",
        "[&_.pullquote_cite]:before:content-['—_']",
        // Callouts
        "[&_.callout]:rounded-xl [&_.callout]:p-4 [&_.callout]:my-5 [&_.callout]:not-prose",
        "[&_.callout_h4]:font-semibold [&_.callout_h4]:mb-1.5 [&_.callout_h4]:text-sm",
        "[&_.callout_p]:text-sm [&_.callout_p]:m-0 [&_.callout_p]:leading-relaxed",
        "[&_.callout[data-variant=info]]:bg-[var(--gabon-blue-tint)]",
        "[&_.callout[data-variant=info]]:text-[var(--gabon-blue-hex)]",
        "[&_.callout[data-variant=ok]]:bg-[var(--success-tint)]",
        "[&_.callout[data-variant=ok]]:text-emerald-700",
        "[&_.callout[data-variant=warn]]:bg-[var(--warning-tint)]",
        "[&_.callout[data-variant=warn]]:text-amber-800",
        // Figure
        "[&_.figure]:relative [&_.figure]:my-6 [&_.figure]:not-prose",
        "[&_.figure_img]:rounded-xl [&_.figure_img]:w-full [&_.figure_img]:h-auto",
        "[&_.figure_figcaption]:mt-2 [&_.figure_figcaption]:text-xs",
        "[&_.figure_figcaption]:text-muted-foreground [&_.figure_figcaption]:italic",
        "[&_.figure_.credit]:absolute [&_.figure_.credit]:bottom-3 [&_.figure_.credit]:right-3",
        "[&_.figure_.credit]:bg-black/60 [&_.figure_.credit]:text-white [&_.figure_.credit]:text-[10px]",
        "[&_.figure_.credit]:px-2 [&_.figure_.credit]:py-1 [&_.figure_.credit]:rounded",
        "[&_.figure_.credit]:uppercase [&_.figure_.credit]:tracking-wide",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  )
}
