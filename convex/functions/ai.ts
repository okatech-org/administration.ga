import { v } from "convex/values"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { internal } from "../_generated/api"
import { ID_PHOTO_GUIDE } from "../ai/assets/idPhotoGuide"

// Maximum total raw size of files we send to Gemini for visual analysis.
// Gemini accepts ~20 MB inlineData per request; base64 inflates by ~33 %, so
// we cap at 12 MB raw to stay under the ceiling once encoded.
const MAX_VISION_PAYLOAD_BYTES = 12 * 1024 * 1024

// MIME types Gemini analyses natively. Other formats fall back to text-only.
const VISION_SUPPORTED_MIME_REGEX = /^(image\/|application\/pdf$)/

// Identity-photo document slug — must match DetailedDocumentType.IdentityPhoto
const IDENTITY_PHOTO_TYPE = "identity_photo"

/**
 * AI Service for analyzing requests using Gemini
 */

// Initialize Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Analysis prompt template
 */
const getAnalysisPrompt = (data: {
  serviceName: string
  isChildProfile?: boolean
  requiredDocuments: string[]
  providedDocuments: string[]
  providedDocumentsDetails: Array<{
    filename: string
    documentType: string
    mimeType: string
  }>
  formDataText: string
  formSchemaFieldsText: string
  // Index map: pour chaque fichier joint au prompt en multimodal, où le retrouver dans la séquence
  visionAttachments: Array<{
    index: number // ordre dans la séquence des `parts` multimodaux (1-based, exclut la photo de référence)
    filename: string
    documentType: string
    mimeType: string
  }>
  hasIdentityPhoto: boolean
  excludedFromVision: Array<{
    filename: string
    documentType: string
    mimeType: string
    reason: string
  }>
}) => `Tu es un assistant consulaire expert. Analyse cette demande de service consulaire.

## Service demandé
${data.serviceName}${data.isChildProfile ? `

## IMPORTANT : Demande pour un profil ENFANT mineur
Cette demande concerne un enfant mineur. Les règles suivantes s'appliquent :
- Les documents liés au domicile (justificatif de domicile) ne sont PAS obligatoires pour un enfant — ils sont fournis via le dossier du parent/tuteur
- Les informations professionnelles ne sont pas requises
- L'acte de naissance est le document d'identité principal
- Le passeport de l'enfant est requis s'il en possède un
- La photo d'identité format passeport est requise
- Ne signale PAS comme manquants les documents qui relèvent du parent/tuteur (justificatif de domicile, attestation d'hébergement, etc.)` : ""}

## Documents requis par le service
${data.requiredDocuments.length > 0 ? data.requiredDocuments.map((d) => `- ${d}`).join("\n") : "Aucun document requis spécifié"}

## Documents fournis par le demandeur
${
  data.providedDocumentsDetails.length > 0
    ? data.providedDocumentsDetails
        .map(
          (d) =>
            `- Type déclaré: "${d.documentType}" | Fichier: "${d.filename}" | Format: ${d.mimeType}`
        )
        .join("\n")
    : "Aucun document fourni"
}${
  data.visionAttachments.length > 0
    ? `

## Analyse visuelle des documents
${data.hasIdentityPhoto ? "La PREMIÈRE pièce jointe à ce message est une **image de référence officielle** pour les photos d'identité (à ne pas confondre avec les documents fournis). Les pièces jointes suivantes sont les fichiers réels du demandeur, dans cet ordre :" : "Les pièces jointes à ce message sont les fichiers réels fournis par le demandeur, dans cet ordre :"}
${data.visionAttachments
  .map(
    (a) =>
      `${a.index}. Type déclaré: "${a.documentType}" | Fichier: "${a.filename}" | Format: ${a.mimeType}`
  )
  .join("\n")}

Pour CHAQUE fichier ci-dessus, vérifie en regardant son contenu :
- Le contenu correspond-il bien au type déclaré ? (ex. un fichier déclaré "passport" doit montrer une page d'identité de passeport, pas autre chose)
- Le document est-il lisible (netteté, luminosité, intégralité — pages complètes pour les PDF) ?
- Si une date d'expiration est lisible, le document n'est-il pas visiblement expiré ?
- Y a-t-il un contenu suspect (capture partielle, screenshot de mauvaise qualité, document tronqué, photo de personne différente de l'identité déclarée dans le formulaire) ?

Si un fichier ne respecte pas ces critères, ajoute-le à \`documentAnalysis.suspicious\` en citant la raison précise (ex : "passport.pdf : seule la page de garde est visible, page d'identité manquante").${data.hasIdentityPhoto ? `

## Vérification des photos d'identité
Compare chaque photo déclarée comme "${IDENTITY_PHOTO_TYPE}" à l'image de référence officielle (1ère pièce jointe).

Critères de conformité (TOUS doivent être respectés) :
- Visage centré et dégagé, occupant ~70-80 % du cadre vertical
- Fond uni et clair (blanc ou gris très clair)
- Expression neutre, bouche fermée, regard face caméra
- Aucun élément occultant le visage : pas de lunettes de soleil, pas de chapeau/casquette, pas de masque
- Photo nette, bien éclairée, sans ombre marquée ni reflet
- Format portrait, qualité suffisante (pas de pixellisation visible)
- Une seule personne sur l'image, visible jusqu'aux épaules

Si une photo identité ne respecte PAS un ou plusieurs critères :
- Ajoute-la à \`documentAnalysis.suspicious\` en listant précisément les critères manqués
- Ajoute une \`suggestedActions\` de type "upload_document" ciblant la photo d'identité, avec un message qui explique au citoyen ce qui ne va pas et l'invite à téléverser une nouvelle photo conforme
- Considère la demande comme \`incomplete\`` : ""}${data.excludedFromVision.length > 0 ? `

### Fichiers non analysés visuellement (format non supporté ou taille excessive)
Pour ces fichiers, base-toi uniquement sur les métadonnées (filename + type déclaré) :
${data.excludedFromVision.map((e) => `- "${e.filename}" (${e.documentType}, ${e.mimeType}) — ${e.reason}`).join("\n")}` : ""}`
    : ""
}

## Structure du formulaire (champs disponibles avec leurs identifiants)
${data.formSchemaFieldsText || "(Aucun schéma de formulaire)"}

## Données du formulaire (valeurs actuelles)
${data.formDataText || "(Aucune donnée de formulaire)"}

## Instructions d'analyse
Analyse cette demande et vérifie :
1. **Documents manquants** : Compare les documents requis avec ceux fournis. Le "type déclaré" doit correspondre à un document requis.
2. **Correspondance des documents** : Vérifie si le type déclaré par l'utilisateur correspond logiquement au fichier uploadé (ex: un PDF nommé "passport_scan.pdf" déclaré comme "Passeport" est cohérent).
3. **Formulaire** : Compare les champs obligatoires du schéma avec les valeurs fournies. Un champ est manquant s'il est requis (obligatoire) dans le schéma mais absent ou vide dans les données.
4. **Anomalies** : Détecte toute incohérence (dates invalides, texte non pertinent, valeurs incohérentes, etc.)

## Format de réponse (JSON uniquement)
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour :
{
  "status": "complete" | "incomplete" | "review_needed",
  "documentAnalysis": {
    "matched": ["liste des documents requis qui ont été fournis correctement"],
    "missing": ["liste des documents requis mais non fournis — utilise le LABEL FR exact du document"],
    "suspicious": ["documents dont le type déclaré ne semble pas correspondre au fichier"]
  },
  "formAnalysis": {
    "missingFields": ["identifiants des champs manquants au format sectionId.fieldId tel qu'indiqué dans la structure du formulaire"],
    "invalidValues": ["identifiants des champs invalides au format sectionId.fieldId"]
  },
  "issues": ["autres problèmes détectés"],
  "summary": "résumé concis de l'analyse en français (max 3 phrases)",
  "confidence": 0-100,
  "suggestedActions": [
    {
      "type": "upload_document" | "complete_info" | "confirm_info",
      "message": "message clair et actionnable pour le citoyen pour cette action spécifique"
    }
  ]
}

IMPORTANT pour missingFields et invalidValues :
- Retourne UNIQUEMENT des identifiants au format "sectionId.fieldId" tel qu'indiqué entre crochets dans la structure du formulaire (ex: "basic_info.last_name", "contact_info.phone")
- N'invente PAS d'identifiants — utilise UNIQUEMENT ceux listés dans le schéma
- Ne retourne PAS de titres de sections — retourne les identifiants de champs individuels

IMPORTANT pour suggestedActions :
- Si des documents sont manquants ET des champs de formulaire sont incomplets, crée DEUX actions séparées (une "upload_document" et une "complete_info")
- Chaque action doit avoir son propre message ciblé
- Si aucune action n'est nécessaire, retourne un tableau vide []`

interface AnalysisResult {
  status: "complete" | "incomplete" | "review_needed"
  documentAnalysis: {
    matched: string[]
    missing: string[]
    suspicious: string[]
  }
  formAnalysis: {
    missingFields: string[]
    invalidValues: string[]
  }
  issues: string[]
  summary: string
  confidence: number
  // New multi-action format
  suggestedActions?: Array<{
    type: "upload_document" | "complete_info" | "confirm_info"
    message: string
  }>
  // Legacy single-action format (backward compat)
  suggestedAction?: "upload_document" | "complete_info" | "confirm_info" | null
  actionMessage?: string | null
}

/**
 * Build formatted analysis note from AI response
 */
function buildAnalysisNote(analysis: AnalysisResult): string {
  const sections: string[] = [
    `**Analyse IA automatique**\n\n${analysis.summary}`,
  ]

  // Document analysis
  const docAnalysis = analysis.documentAnalysis
  if (docAnalysis?.missing?.length > 0) {
    sections.push(
      `\n\n** Documents manquants:**\n${docAnalysis.missing.map((d: string) => `- ${d}`).join("\n")}`
    )
  }
  if (docAnalysis?.suspicious?.length > 0) {
    sections.push(
      `\n\n** Documents à vérifier:**\n${docAnalysis.suspicious.map((d: string) => `- ${d}`).join("\n")}`
    )
  }
  if (docAnalysis?.matched?.length > 0) {
    sections.push(
      `\n\n** Documents fournis:**\n${docAnalysis.matched.map((d: string) => `- ${d}`).join("\n")}`
    )
  }

  // Form analysis
  const formAnalysis = analysis.formAnalysis
  if (formAnalysis?.missingFields?.length > 0) {
    sections.push(
      `\n\n** Champs manquants:**\n${formAnalysis.missingFields.map((f: string) => `- ${f}`).join("\n")}`
    )
  }
  if (formAnalysis?.invalidValues?.length > 0) {
    sections.push(
      `\n\n** Valeurs invalides:**\n${formAnalysis.invalidValues.map((f: string) => `- ${f}`).join("\n")}`
    )
  }

  // Other issues
  if (analysis.issues?.length > 0) {
    sections.push(
      `\n\n**ℹ Points d'attention:**\n${analysis.issues.map((i: string) => `- ${i}`).join("\n")}`
    )
  }

  return sections.join("")
}

/**
 * Analyze a request using Gemini AI
 * Triggered automatically when a request is submitted
 */
export const analyzeRequest = internalAction({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args): Promise<void> => {
    // Fetch request data
    const request = await ctx.runQuery(internal.functions.ai.getRequestData, {
      requestId: args.requestId,
    })

    if (!request) {
      console.error(`Request ${args.requestId} not found for AI analysis`)
      return
    }

    try {
      const genAI = getGeminiClient()
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
      })

      // Load attachments as base64 inlineData parts, prioritising identity
      // photos and required documents within the size budget.
      const {
        inlineParts,
        visionAttachments,
        excludedFromVision,
        hasIdentityPhoto,
      } = await loadVisionAttachments(
        ctx,
        request.attachedFiles || [],
        new Set(request.requiredDocuments)
      )

      const prompt = getAnalysisPrompt({
        serviceName: request.serviceName,
        isChildProfile: request.isChildProfile,
        requiredDocuments: request.requiredDocuments,
        providedDocuments: request.providedDocuments,
        providedDocumentsDetails: request.providedDocumentsDetails || [],
        formDataText: request.formDataText || "",
        formSchemaFieldsText: formatFormSchemaForPrompt(
          request.formSchemaSections || []
        ),
        visionAttachments,
        hasIdentityPhoto,
        excludedFromVision,
      })

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = []
      if (hasIdentityPhoto) {
        parts.push({
          inlineData: {
            mimeType: ID_PHOTO_GUIDE.mimeType,
            data: ID_PHOTO_GUIDE.base64,
          },
        })
      }
      parts.push(...inlineParts)
      parts.push({ text: prompt })

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      })
      const responseText = result.response.text()

      // Parse JSON response
      let analysis: AnalysisResult
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error("No JSON found in response")
        }
        analysis = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error("Failed to parse AI response:", responseText)
        analysis = {
          status: "review_needed",
          documentAnalysis: { matched: [], missing: [], suspicious: [] },
          formAnalysis: { missingFields: [], invalidValues: [] },
          issues: ["Erreur lors de l'analyse automatique"],
          summary:
            "L'analyse automatique n'a pas pu être complétée. Vérification manuelle requise.",
          confidence: 0,
          suggestedActions: [],
        }
      }

      // Create AI note with analysis results
      const noteContent = buildAnalysisNote(analysis)
      await ctx.runMutation(internal.functions.ai.createAINote, {
        requestId: args.requestId,
        content: noteContent,
        analysisType: "completeness",
        confidence: analysis.confidence,
      })

      // If critical issues found, trigger action(s) required
      if (analysis.status === "incomplete") {
        // Normalize to action array (support both new and legacy format)
        const actions: Array<{
          type: "upload_document" | "complete_info" | "confirm_info"
          message: string
        }> = []
        if (analysis.suggestedActions?.length) {
          actions.push(...analysis.suggestedActions)
        } else if (analysis.suggestedAction && analysis.actionMessage) {
          actions.push({
            type: analysis.suggestedAction,
            message: analysis.actionMessage,
          })
        }

        // Build document type mapping
        const missingDocs = analysis.documentAnalysis?.missing || []
        const joinedDocs = request.joinedDocumentTypes || []
        const labelToSlugMap = new Map<
          string,
          {
            type: string
            label: { fr: string; en?: string }
            required: boolean
          }
        >()
        for (const jd of joinedDocs) {
          const frLabel = (jd.label as { fr?: string })?.fr || jd.type
          const enLabel = (jd.label as { en?: string })?.en
          const entry: {
            type: string
            label: { fr: string; en?: string }
            required: boolean
          } = {
            type: jd.type,
            label: { fr: frLabel, ...(enLabel ? { en: enLabel } : {}) },
            required: jd.required,
          }
          labelToSlugMap.set(frLabel.toLowerCase(), entry)
          labelToSlugMap.set(jd.type.toLowerCase(), entry)
        }

        const mappedDocTypes =
          missingDocs.length > 0
            ? missingDocs.map((docLabel) => {
                const matched = labelToSlugMap.get(docLabel.toLowerCase())
                if (matched) {
                  return {
                    type: matched.type,
                    label: matched.label,
                    required: matched.required,
                  }
                }
                return {
                  type: "other_official_document",
                  label: { fr: docLabel, en: docLabel },
                  required: true,
                }
              })
            : undefined

        // Build field mapping for complete_info actions
        const missingFields = analysis.formAnalysis?.missingFields || []
        const mappedFields =
          missingFields.length > 0
            ? mapMissingFieldsToStructured(
                missingFields,
                request.formSchemaSections || [],
                request.rawFormData || {}
              )
            : undefined

        // Trigger each action
        for (const action of actions) {
          await ctx.runMutation(internal.functions.ai.triggerActionRequired, {
            requestId: args.requestId,
            type: action.type,
            message: action.message,
            documentTypes:
              action.type === "upload_document" ? mappedDocTypes : undefined,
            fields:
              action.type === "complete_info" && mappedFields?.length
                ? mappedFields
                : undefined,
          })
        }
      }

    } catch (error) {
      console.error(`AI analysis failed for request ${args.requestId}:`, error)

      // Create error note
      await ctx.runMutation(internal.functions.ai.createAINote, {
        requestId: args.requestId,
        content: `**Analyse IA - Erreur**\n\nL'analyse automatique n'a pas pu être effectuée. Vérification manuelle recommandée.`,
        analysisType: "completeness",
        confidence: 0,
      })
    }
  },
})

/**
 * Load attached files from Convex storage and convert to Gemini inlineData
 * parts, respecting MAX_VISION_PAYLOAD_BYTES. Identity photos and files
 * matching a required-document label are loaded first.
 */
async function loadVisionAttachments(
  ctx: { storage: { get: (id: Id<"_storage">) => Promise<Blob | null> } },
  files: Array<{
    storageId: Id<"_storage">
    filename: string
    mimeType: string
    sizeBytes: number
    documentType: string
  }>,
  requiredLabels: Set<string>
): Promise<{
  inlineParts: Array<{ inlineData: { mimeType: string; data: string } }>
  visionAttachments: Array<{
    index: number
    filename: string
    documentType: string
    mimeType: string
  }>
  excludedFromVision: Array<{
    filename: string
    documentType: string
    mimeType: string
    reason: string
  }>
  hasIdentityPhoto: boolean
}> {
  const inlineParts: Array<{
    inlineData: { mimeType: string; data: string }
  }> = []
  const visionAttachments: Array<{
    index: number
    filename: string
    documentType: string
    mimeType: string
  }> = []
  const excludedFromVision: Array<{
    filename: string
    documentType: string
    mimeType: string
    reason: string
  }> = []

  // Priority: 1) identity photos, 2) required-doc matches, 3) the rest
  const priority = (f: (typeof files)[number]) => {
    if (f.documentType === IDENTITY_PHOTO_TYPE) return 0
    if (requiredLabels.has(f.documentType)) return 1
    return 2
  }
  const ordered = [...files].sort((a, b) => priority(a) - priority(b))

  let usedBytes = 0
  let hasIdentityPhoto = false

  for (const file of ordered) {
    if (!VISION_SUPPORTED_MIME_REGEX.test(file.mimeType)) {
      excludedFromVision.push({
        filename: file.filename,
        documentType: file.documentType,
        mimeType: file.mimeType,
        reason: "format non supporté pour l'analyse visuelle",
      })
      continue
    }
    if (usedBytes + file.sizeBytes > MAX_VISION_PAYLOAD_BYTES) {
      excludedFromVision.push({
        filename: file.filename,
        documentType: file.documentType,
        mimeType: file.mimeType,
        reason: "taille excédant le budget d'analyse visuelle",
      })
      continue
    }
    try {
      const blob = await ctx.storage.get(file.storageId)
      if (!blob) {
        excludedFromVision.push({
          filename: file.filename,
          documentType: file.documentType,
          mimeType: file.mimeType,
          reason: "fichier introuvable dans le stockage",
        })
        continue
      }
      const arrayBuffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ""
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)

      inlineParts.push({
        inlineData: { mimeType: file.mimeType, data: base64 },
      })
      // Index is 1-based and reflects the order seen by the AI within
      // the user's documents (excluding the reference photo).
      visionAttachments.push({
        index: visionAttachments.length + 1,
        filename: file.filename,
        documentType: file.documentType,
        mimeType: file.mimeType,
      })
      usedBytes += file.sizeBytes
      if (file.documentType === IDENTITY_PHOTO_TYPE) {
        hasIdentityPhoto = true
      }
    } catch (err) {
      console.error(
        `Failed to load attachment ${file.filename} for AI analysis:`,
        err
      )
      excludedFromVision.push({
        filename: file.filename,
        documentType: file.documentType,
        mimeType: file.mimeType,
        reason: "erreur de chargement",
      })
    }
  }

  return {
    inlineParts,
    visionAttachments,
    excludedFromVision,
    hasIdentityPhoto,
  }
}

/**
 * Internal query to get request data for analysis
 */
export const getRequestData = internalQuery({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) return null

    // Get service info
    const orgService = await ctx.db.get(request.orgServiceId)
    const service = orgService ? await ctx.db.get(orgService.serviceId) : null

    // Get documents with their types
    const documents = await Promise.all(
      (request.documents || []).map(async (docId) => {
        const doc = await ctx.db.get(docId)
        const firstFile = doc?.files?.[0]
        return {
          filename: firstFile?.filename || "Document sans nom",
          documentType: doc?.documentType || "type_inconnu",
          mimeType: firstFile?.mimeType || "",
        }
      })
    )

    // Flatten ALL files across all documents — used by the action to load
    // blobs and feed them to Gemini for visual analysis.
    const attachedFiles: Array<{
      storageId: Id<"_storage">
      filename: string
      mimeType: string
      sizeBytes: number
      documentType: string
    }> = []
    for (const docId of request.documents || []) {
      const doc = await ctx.db.get(docId)
      if (!doc?.files) continue
      const documentType = doc.documentType || "type_inconnu"
      for (const file of doc.files) {
        if (!file.storageId) continue
        attachedFiles.push({
          storageId: file.storageId as Id<"_storage">,
          filename: file.filename || "Document sans nom",
          mimeType: file.mimeType || "",
          sizeBytes: file.sizeBytes || 0,
          documentType,
        })
      }
    }

    // Transform formData to human-readable text for AI prompt
    const formDataText = formatFormDataForPrompt(
      request.formData || {},
      service?.formSchema
    )

    // Get required documents from formSchema.joinedDocuments
    const joinedDocs = service?.formSchema?.joinedDocuments ?? []

    // Detect if this request is for a child profile
    let isChildProfile = false
    if (request.profileId) {
      const maybeChild = await ctx.db.get(request.profileId as Id<"childProfiles">)
      if (maybeChild && "authorUserId" in maybeChild) {
        isChildProfile = true
      }
    }

    return {
      serviceName: service?.name?.fr || service?.name?.en || "Service inconnu",
      isChildProfile,
      requiredDocuments: joinedDocs.map(
        (d: { label?: { fr?: string; en?: string }; type: string }) =>
          d.label?.fr || d.type
      ),
      // Raw joinedDocs with type slugs for mapping AI labels back to slugs
      joinedDocumentTypes: joinedDocs.map(
        (d: {
          label?: { fr?: string; en?: string }
          type: string
          required?: boolean
        }) => ({
          type: d.type,
          label: d.label || { fr: d.type, en: d.type },
          required: d.required ?? false,
        })
      ),
      providedDocuments: documents.map(
        (d) => `${d.documentType} (${d.filename})`
      ),
      providedDocumentsDetails: documents,
      attachedFiles,
      formDataText, // Human-readable text for AI prompt
      rawFormData: request.formData || {},
      // Form schema sections for mapping AI-detected missing fields to structured field data
      formSchemaSections: (service?.formSchema?.sections ?? []).map(
        (s: {
          id: string
          title: { fr?: string; en?: string }
          fields?: Array<{
            id: string
            type?: string
            label: { fr?: string; en?: string }
            required?: boolean
            options?: unknown
          }>
        }) => ({
          id: s.id,
          title: s.title,
          fields: (s.fields ?? []).map((f) => ({
            id: f.id,
            type: f.type,
            label: f.label,
            required: f.required,
            options: f.options,
          })),
        })
      ),
    }
  },
})

/**
 * Transform formData to human-readable text format for AI prompt
 * This avoids Convex serialization issues with non-ASCII characters in object keys
 */
function formatFormDataForPrompt(
  formData: Record<string, unknown>,
  formSchema?: {
    sections?: Array<{
      id: string
      title: { fr?: string; en?: string }
      fields?: Array<{ id: string; label: { fr?: string; en?: string } }>
    }>
  } | null
): string {
  if (!formSchema?.sections) {
    return JSON.stringify(formData, null, 2)
  }

  const lines: string[] = []

  for (const [sectionId, sectionData] of Object.entries(formData)) {
    const sectionSchema = formSchema.sections.find((s) => s.id === sectionId)

    const sectionLabel = sectionSchema?.title?.fr || sectionId
    lines.push(`\n### ${sectionLabel}`)

    // Handle array sections (e.g. emergency_contacts)
    if (Array.isArray(sectionData)) {
      if (sectionData.length === 0) {
        lines.push(`- (aucun contact renseigné)`)
      } else {
        sectionData.forEach((item: unknown, index: number) => {
          lines.push(`\n**Contact ${index + 1}**`)
          if (typeof item === "object" && item !== null) {
            for (const [fieldId, fieldValue] of Object.entries(
              item as Record<string, unknown>
            )) {
              const fieldSchema = sectionSchema?.fields?.find((f) => f.id === fieldId)
              const fieldLabel = fieldSchema?.label?.fr || fieldId
              const displayValue = fieldValue ?? "(non renseigné)"
              lines.push(`- ${fieldLabel}: ${displayValue}`)
            }
          }
        })
      }
    } else if (typeof sectionData === "object" && sectionData !== null) {
      for (const [fieldId, fieldValue] of Object.entries(
        sectionData as Record<string, unknown>
      )) {
        const fieldSchema = sectionSchema?.fields?.find((f) => f.id === fieldId)
        const fieldLabel = fieldSchema?.label?.fr || fieldId
        const displayValue = fieldValue ?? "(non renseigné)"
        lines.push(`- **${fieldLabel}**: ${displayValue}`)
      }
    } else {
      lines.push(`- ${sectionData}`)
    }
  }

  return lines.join("\n")
}

/**
 * Format form schema sections as readable text for the AI prompt
 * This gives the AI the exact field labels to use in missingFields
 */
function formatFormSchemaForPrompt(
  sections: Array<{
    id: string;
    title: { fr?: string; en?: string };
    description?: { fr?: string; en?: string };
    fields: Array<{
      id: string;
      type?: string;
      label: { fr?: string; en?: string };
      required?: boolean;
      options?: unknown;
    }>;
  }>,
): string {
  if (sections.length === 0) return "";

  const lines: string[] = [];
  for (const section of sections) {
    const sectionLabel = section.title?.fr || section.id;
    lines.push(`\n### ${sectionLabel} (section: ${section.id})`);
    if (section.description?.fr) {
      lines.push(`> ${section.description.fr}`);
    }
    for (const field of section.fields) {
      const fieldLabel = field.label?.fr || field.id;
      const requiredMark = field.required ? " (obligatoire)" : " (optionnel)";
      lines.push(`- ${fieldLabel}${requiredMark} [${section.id}.${field.id}]`);
    }
  }
  return lines.join("\n");
}

/**
 * Map AI-detected missing field paths to structured field data using form schema.
 * The AI returns field paths like "section_id.field_id" — we resolve label, type,
 * options from the schema. Unknown paths are silently skipped (not invented).
 */
function mapMissingFieldsToStructured(
  missingFieldPaths: string[],
  formSchemaSections: Array<{
    id: string;
    title: { fr?: string; en?: string };
    fields: Array<{
      id: string;
      type?: string;
      label: { fr?: string; en?: string };
      required?: boolean;
      options?: unknown;
    }>;
  }>,
  rawFormData: Record<string, unknown>,
): Array<{
  fieldPath: string;
  label: { fr: string; en?: string };
  type: string;
  options?: unknown;
  currentValue?: unknown;
  sectionTitle?: { fr: string; en?: string };
}> {
  // Build lookup: "sectionId.fieldId" -> schema field info
  const fieldByPath = new Map<
    string,
    {
      label: { fr: string; en?: string };
      type: string;
      options?: unknown;
      sectionTitle: { fr: string; en?: string };
    }
  >();

  for (const section of formSchemaSections) {
    const sectionTitle: { fr: string; en?: string } = {
      fr: section.title?.fr || section.id,
      ...(section.title?.en ? { en: section.title.en } : {}),
    };
    for (const field of section.fields) {
      const frLabel = field.label?.fr || field.id;
      const enLabel = field.label?.en;
      fieldByPath.set(`${section.id}.${field.id}`, {
        label: { fr: frLabel, ...(enLabel ? { en: enLabel } : {}) },
        type: field.type || "text",
        options: field.options,
        sectionTitle,
      });
    }
  }

  const result: Array<{
    fieldPath: string;
    label: { fr: string; en?: string };
    type: string;
    options?: unknown;
    currentValue?: unknown;
    sectionTitle?: { fr: string; en?: string };
  }> = [];

  for (const fieldPath of missingFieldPaths) {
    const schema = fieldByPath.get(fieldPath);
    if (!schema) continue; // Unknown path — skip, don't invent fields

    // Extract current value from rawFormData
    const [sectionId, fieldId] = fieldPath.split(".");
    const sectionData = rawFormData[sectionId];
    const currentValue =
      typeof sectionData === "object" && sectionData !== null
        ? (sectionData as Record<string, unknown>)[fieldId]
        : undefined;

    result.push({
      fieldPath,
      label: schema.label,
      type: schema.type,
      options: schema.options,
      currentValue,
      sectionTitle: schema.sectionTitle,
    });
  }

  return result;
}

/**
 * Internal mutation to create AI note
 */
export const createAINote = internalMutation({
  args: {
    requestId: v.id("requests"),
    content: v.string(),
    analysisType: v.union(
      v.literal("completeness"),
      v.literal("document_check"),
      v.literal("data_validation")
    ),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentNotes", {
      requestId: args.requestId,
      content: args.content,
      source: "ai",
      aiAnalysisType: args.analysisType,
      aiConfidence: args.confidence,
      createdAt: Date.now(),
    })
  },
})

/**
 * Internal mutation to trigger action required from AI analysis
 */
export const triggerActionRequired = internalMutation({
  args: {
    requestId: v.id("requests"),
    type: v.union(
      v.literal("upload_document"),
      v.literal("complete_info"),
      v.literal("confirm_info")
    ),
    message: v.string(),
    documentTypes: v.optional(
      v.array(
        v.object({
          type: v.string(),
          label: v.optional(v.any()),
          required: v.optional(v.boolean()),
        })
      )
    ),
    fields: v.optional(
      v.array(
        v.object({
          fieldPath: v.string(),
          label: v.optional(v.any()),
          type: v.optional(v.string()),
          options: v.optional(v.any()),
          currentValue: v.optional(v.any()),
          sectionTitle: v.optional(v.any()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) return

    const existingActions = (request as any).actionsRequired ?? []

    // Skip if an action of this type already exists and is not completed
    const hasPendingOfSameType = existingActions.some(
      (a: any) => a.type === args.type && !a.completedAt
    )
    if (hasPendingOfSameType) return

    const actionId = crypto.randomUUID().slice(0, 12)

    await ctx.db.patch(args.requestId, {
      actionsRequired: [
        ...existingActions,
        {
          id: actionId,
          type: args.type,
          message: args.message,
          documentTypes: args.documentTypes,
          fields: args.fields,
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    })
  },
})
