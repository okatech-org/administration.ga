// Dispatcher d'impression web ↔ desktop. Détecte le contexte via isDesktop() et route vers :
// - Web : window.open(blobUrl).print() ou téléchargement PDF.
// - Desktop : desktopApi.printer.printPdf() (nouveau channel IPC à ajouter) + desktopApi.printer.printCard() pour les cartes Evolis.
// À implémenter lors de l'étape 3 du plan.
export {}
