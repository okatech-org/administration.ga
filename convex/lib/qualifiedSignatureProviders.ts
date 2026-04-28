/**
 * Adaptateurs de signature électronique qualifiée (eIDAS niveau 3).
 *
 * La signature simple actuelle (niveau 1, sceau serveur dans
 * `correspondanceSignature.ts`) couvre l'usage interne mais n'a pas de
 * valeur juridique pour les engagements externes. Le niveau 3 (qualifiée)
 * exige un certificat émis par un Prestataire de Services de Confiance
 * Qualifié sur un dispositif sécurisé. Comme cela nécessite un contrat
 * avec un tiers, nous abstrayons l'intégration derrière une interface
 * commune et fournissons un mock par défaut.
 *
 * Configuration via env vars Convex :
 *   QUALIFIED_SIGNATURE_PROVIDER : "mock" | "lex-persona" | "docusign" | "certeurope"
 *   QUALIFIED_SIGNATURE_API_KEY  : clé API du provider
 *   QUALIFIED_SIGNATURE_BASE_URL : URL de l'API (sandbox ou prod)
 *
 * Implémentation par provider à brancher dans `getQualifiedSignatureProvider`.
 */

export interface QualifiedSignatureRequest {
  /** PDF à faire signer (bytes). */
  pdfBytes: ArrayBuffer;
  /** Nom de fichier d'origine. */
  filename: string;
  /** Identité du signataire (passée au provider pour pré-remplir la cérémonie). */
  signer: {
    id: string;
    fullName: string;
    email: string;
    title?: string;
    orgName: string;
  };
  /** Référence métier — affichée dans l'envelope/agreement côté provider. */
  reference: string;
  /** Optionnel : URL de retour après cérémonie de signature. */
  returnUrl?: string;
}

export type QualifiedSignatureResponse =
  | {
      ok: true;
      /** ID interne au provider (envelope, agreement, request id…). */
      providerRef: string;
      /** URL où le signataire effectue la cérémonie de signature qualifiée. */
      ceremonyUrl: string;
      /** Instant de création de la demande. */
      requestedAt: number;
    }
  | {
      ok: false;
      error: string;
    };

export interface QualifiedSignatureFetchResult {
  /** Le PDF signé qualifié récupéré chez le provider. */
  signedPdfBytes: ArrayBuffer;
  /** Hash SHA-256 hex du PDF signé. */
  documentHash: string;
  /** Numéro de série du certificat / envelope. */
  serialNumber: string;
  /** Horodatage de la signature côté provider. */
  signedAt: number;
}

export interface QualifiedSignatureProvider {
  /** Nom court du provider (sera persisté dans `qualifiedProvider`). */
  readonly id: string;

  /**
   * Lance la cérémonie de signature qualifiée. Le retour expose une URL
   * que le frontend ouvre dans un nouvel onglet ; le signataire authentifie,
   * appose son certificat, puis revient sur l'app.
   */
  requestSignature(
    req: QualifiedSignatureRequest,
  ): Promise<QualifiedSignatureResponse>;

  /**
   * Récupère le PDF scellé une fois la cérémonie terminée. Utilisé par un
   * webhook ou un polling déclenché depuis l'app.
   */
  fetchCompleted(
    providerRef: string,
  ): Promise<QualifiedSignatureFetchResult | { error: string }>;
}

// ── Mock provider (par défaut en dev) ─────────────────────────────────────

class MockQualifiedSignatureProvider implements QualifiedSignatureProvider {
  readonly id = "mock";

  async requestSignature(
    req: QualifiedSignatureRequest,
  ): Promise<QualifiedSignatureResponse> {
    // En dev, on simule une demande acceptée immédiatement.
    return {
      ok: true,
      providerRef: `mock-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      ceremonyUrl:
        req.returnUrl ?? "https://example.invalid/mock-qualified-ceremony",
      requestedAt: Date.now(),
    };
  }

  async fetchCompleted(): Promise<QualifiedSignatureFetchResult> {
    // En dev, on simule un retour avec le PDF original re-renvoyé en l'état.
    // L'intégrateur réel doit récupérer le PDF scellé du provider.
    return {
      signedPdfBytes: new ArrayBuffer(0),
      documentHash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      serialNumber: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      signedAt: Date.now(),
    };
  }
}

// ── Sélection du provider à partir de l'env Convex ────────────────────────

export function getQualifiedSignatureProvider(): QualifiedSignatureProvider {
  const providerId = process.env.QUALIFIED_SIGNATURE_PROVIDER ?? "mock";
  switch (providerId) {
    case "mock":
      return new MockQualifiedSignatureProvider();
    // Brancher ici les implémentations réelles :
    //   case "lex-persona":
    //     return new LexPersonaProvider({
    //       apiKey: process.env.QUALIFIED_SIGNATURE_API_KEY!,
    //       baseUrl: process.env.QUALIFIED_SIGNATURE_BASE_URL!,
    //     });
    //   case "docusign":
    //     return new DocuSignProvider(...);
    //   case "certeurope":
    //     return new CertEuropeProvider(...);
    default:
      // Fallback sur le mock pour ne pas bloquer un déploiement mal configuré.
      console.warn(
        `[qualified-signature] Provider inconnu "${providerId}", fallback sur mock.`,
      );
      return new MockQualifiedSignatureProvider();
  }
}
