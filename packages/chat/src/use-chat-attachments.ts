import { useCallback, useRef, useState } from "react";

/** Taille max par fichier côté client (aligné sur Convex `addAttachment`). */
export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo

/**
 * Formate une taille en bytes en string lisible (`3,2 Mo`, `12 ko`, `789 o`).
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ko`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} Mo`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

/**
 * MIME types autorisés. Synchronisé avec `convex/functions/correspondance.ts
 * ALLOWED_ATTACHMENT_MIME_TYPES`. Si vous étendez la liste, pensez à mettre à
 * jour les deux.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES: ReadonlyArray<string> = [
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface PendingAttachment {
	/** Fichier en attente d'upload (pas encore envoyé au backend). */
	file: File;
	/** ID local uniquement — pour supprimer avant envoi. */
	localId: string;
}

/**
 * useChatAttachments — gère une liste locale de fichiers joints en attente
 * dans un composer, avec validation client (taille + MIME) et messages
 * utilisateur. L'upload vers le backend est délégué à l'appelant via
 * `consumeForUpload()` qui retourne les fichiers prêts et vide la liste.
 *
 * Usage type dans un ChatComposer :
 * ```tsx
 * const {
 *   attachments, addFiles, remove, clear, consumeForUpload,
 * } = useChatAttachments({
 *   onValidationError: (msg) => toast.error(msg),
 * });
 *
 * const handleSend = async () => {
 *   const pendingFiles = consumeForUpload();
 *   const storageIds = await Promise.all(
 *     pendingFiles.map(async (f) => {
 *       const url = await generateUploadUrl();
 *       const res = await fetch(url, { method: "POST", body: f, headers: { "Content-Type": f.type } });
 *       return (await res.json()).storageId;
 *     }),
 *   );
 *   await sendChatMessage({ chatId, content, attachments: storageIds });
 * };
 * ```
 */
export function useChatAttachments(options?: {
	onValidationError?: (message: string) => void;
}) {
	const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
	const counterRef = useRef(0);

	const addFiles = useCallback(
		(files: FileList | File[]) => {
			const fileArray = Array.from(files);
			const accepted: PendingAttachment[] = [];
			for (const file of fileArray) {
				if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
					options?.onValidationError?.(
						`${file.name} dépasse la taille max autorisée (50 Mo).`,
					);
					continue;
				}
				if (
					file.type &&
					!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)
				) {
					options?.onValidationError?.(
						`${file.name} : type non autorisé (${file.type}).`,
					);
					continue;
				}
				counterRef.current += 1;
				accepted.push({
					file,
					localId: `pending-${Date.now()}-${counterRef.current}`,
				});
			}
			if (accepted.length > 0) {
				setAttachments((prev) => [...prev, ...accepted]);
			}
		},
		[options],
	);

	const remove = useCallback((localId: string) => {
		setAttachments((prev) => prev.filter((a) => a.localId !== localId));
	}, []);

	const clear = useCallback(() => {
		setAttachments([]);
	}, []);

	/**
	 * Retourne les File objects prêts à être uploadés et vide la liste locale.
	 * À appeler juste avant l'envoi du message.
	 */
	const consumeForUpload = useCallback((): File[] => {
		const files = attachments.map((a) => a.file);
		setAttachments([]);
		return files;
	}, [attachments]);

	return {
		attachments,
		addFiles,
		remove,
		clear,
		consumeForUpload,
	};
}
