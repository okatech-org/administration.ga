import { motion, AnimatePresence } from "motion/react";
import { X, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ViewerDoc {
	id: string;
	title: string;
	url?: string;
	mimeType?: string;
}

interface DocumentViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	document: ViewerDoc | null;
}

export function DocumentViewerModal({ isOpen, onClose, document }: DocumentViewerModalProps) {
	const url = document?.url || "/docs/sample.pdf"; 
	const effMimeType = document?.mimeType || "application/pdf";

	return (
		<AnimatePresence>
			{isOpen && document && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8"
					onClick={onClose}
				>
					<motion.div
						layoutId={`doc-card-${document.id}`}
						className="bg-background rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl h-[90vh] flex flex-col relative border border-border/50"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
							<div className="flex items-center gap-3">
								<div className="p-1.5 rounded-md bg-primary/10">
									<FileText className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold text-sm leading-tight">{document.title}</h3>
									<p className="text-[10px] text-muted-foreground uppercase tracking-widest">{effMimeType}</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" asChild className="h-8 gap-1.5 hidden sm:flex">
									<a href={url} download={document.title} target="_blank" rel="noopener noreferrer">
										<Download className="h-3.5 w-3.5" />
										<span className="text-xs">Télécharger</span>
									</a>
								</Button>
								<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={onClose}>
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Viewer Content */}
						<div className="flex-1 w-full bg-muted/10 relative">
							{effMimeType === "application/pdf" ? (
								<iframe 
									src={`${url}#view=FitH`} 
									className="w-full h-full border-0 absolute inset-0" 
									title={document.title}
								/>
							) : effMimeType.startsWith("image/") ? (
								<div className="w-full h-full flex items-center justify-center p-4">
									<img 
										src={url} 
										alt={document.title} 
										className="max-w-full max-h-full object-contain rounded drop-shadow-md" 
									/>
								</div>
							) : (
								<div className="h-full flex flex-col items-center justify-center space-y-4">
									<FileText className="h-16 w-16 text-muted-foreground/30" />
									<p className="text-sm font-medium text-center max-w-sm">Aperçu non disponible pour ce format de fichier ({effMimeType}).</p>
									<Button asChild className="gap-2">
										<a href={url} download={document.title} target="_blank" rel="noopener noreferrer">
											<Download className="h-4 w-4" /> Télécharger pour lire
										</a>
									</Button>
								</div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
