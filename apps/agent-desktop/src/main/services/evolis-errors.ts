/**
 * French error messages for Evolis SDK error codes.
 * Ported from Agent macOS PrintError enum.
 */

/**
 * User-friendly French description for Evolis print error codes.
 */
export function describePrintError(code: number): string {
  switch (code) {
    case 0:
      return "Impression réussie"
    case -1: // EVOLIS_RC_EUNDEFINED
      return "Erreur inconnue. Redémarrez l'imprimante et réessayez."
    case -2: // EVOLIS_RC_EINTERNAL
      return "Erreur interne du SDK. Contactez le support technique."
    case -3: // EVOLIS_RC_EPARAMS
      return "Paramètres d'impression invalides."
    case -4: // EVOLIS_RC_ETIMEOUT
      return "Délai d'attente dépassé. L'imprimante ne répond pas."
    case -20: // EVOLIS_RC_PRINT_EDATA
      return "Données d'image invalides. Vérifiez le design de la carte."
    case -21: // EVOLIS_RC_PRINT_NEEDACTION
      return "L'imprimante nécessite une intervention. Vérifiez le ruban, le capot et le bac à cartes."
    case -22: // EVOLIS_RC_PRINT_EMECHANICAL
      return "Erreur mécanique. Vérifiez qu'il n'y a pas de carte coincée, que le ruban est correctement installé et que le capot est bien fermé."
    case -23: // EVOLIS_RC_PRINT_ENOIMAGE
      return "Aucune image à imprimer. Assurez-vous qu'un design est chargé."
    case -60: // EVOLIS_RC_PRINTER_ENOCOM
      return "Imprimante hors ligne. Vérifiez la connexion USB."
    case -62: // EVOLIS_RC_PRINTER_EOTHER
      return "L'imprimante est utilisée par un autre logiciel. Fermez les autres applications."
    case -63: // EVOLIS_RC_PRINTER_EBUSY
      return "L'imprimante est occupée (CUPS en cours d'impression)."
    case 1700:
      return "EPS2 (Evolis Print Suite) bloque l'impression. Arrêtez EPS2 avec : sudo launchctl unload /Library/LaunchDaemons/com.evolis.evoservice.plist"
    default:
      return `Erreur d'impression (code: ${code})`
  }
}

/**
 * Generic SDK error description in French.
 */
export function describeSdkError(code: number): string {
  switch (code) {
    case 0:   return "Succès"
    case -1:  return "Erreur indéfinie"
    case -2:  return "Erreur interne"
    case -3:  return "Paramètres invalides"
    case -4:  return "Délai dépassé"
    case -11: return "Session occupée (EPS2)"
    case -20: return "Données invalides"
    case -21: return "Intervention nécessaire"
    case -22: return "Erreur mécanique"
    case -23: return "Aucune image"
    case -50: return "Encodage NFC échoué"
    case -60: return "Imprimante hors ligne"
    case -62: return "Imprimante utilisée par autre logiciel"
    case -63: return "Imprimante occupée"
    default:  return `Code ${code}`
  }
}
