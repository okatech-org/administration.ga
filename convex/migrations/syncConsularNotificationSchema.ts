/**
 * One-shot migration : aligne le service "consular-notification" avec la
 * nouvelle définition fonctionnelle.
 *
 * Changements appliqués (idempotents) :
 *   1. Insère le document requis "Visa ou titre de séjour" (residence_permit)
 *      juste après le passeport, dans :
 *        - service.formSchema.joinedDocuments
 *        - service.joinedDocuments (top-level)
 *   2. Supprime toute entrée legacy "hosting_certificate" (justificatif de
 *      séjour) ajoutée par une ancienne version de la migration.
 *   3. Bascule les champs `stay_street` et `stay_city` de la section
 *      `temporary_address` en `required: false`.
 *
 * À invoquer :
 *   bunx convex run migrations/syncConsularNotificationSchema:run
 */
import { internalMutation } from "../_generated/server";
import { DetailedDocumentType } from "../lib/constants";

const TRAVEL_AUTH_DOC = {
	type: DetailedDocumentType.ResidencePermit,
	label: {
		fr: "Visa ou titre de séjour en cours de validité",
		en: "Valid visa or residence permit",
	},
	required: true,
} as const;

function syncJoinedDocuments(
	docs: Array<{ type: string; label: any; required: boolean }> | undefined,
): {
	next: Array<{ type: string; label: any; required: boolean }>;
	changed: boolean;
} {
	const list = docs ?? [];
	let changed = false;

	// 1) Drop any legacy hosting_certificate entry
	const cleaned = list.filter((d) => {
		if (d.type === DetailedDocumentType.HostingCertificate) {
			changed = true;
			return false;
		}
		return true;
	});

	// 2) Ensure travel auth (residence_permit) is present right after passport
	const hasAuth = cleaned.some(
		(d) => d.type === DetailedDocumentType.ResidencePermit,
	);
	if (!hasAuth) {
		const passportIdx = cleaned.findIndex(
			(d) => d.type === DetailedDocumentType.Passport,
		);
		const inserted =
			passportIdx === -1
				? [TRAVEL_AUTH_DOC, ...cleaned]
				: [
						...cleaned.slice(0, passportIdx + 1),
						TRAVEL_AUTH_DOC,
						...cleaned.slice(passportIdx + 1),
					];
		return { next: inserted, changed: true };
	}

	return { next: cleaned, changed };
}

function syncTemporaryAddressFields(
	sections:
		| Array<{
				id: string;
				title: any;
				description?: any;
				fields: Array<{ id: string; required: boolean; [k: string]: any }>;
		  }>
		| undefined,
): {
	next:
		| Array<{
				id: string;
				title: any;
				description?: any;
				fields: Array<{ id: string; required: boolean; [k: string]: any }>;
		  }>
		| undefined;
	changed: boolean;
} {
	if (!sections) return { next: sections, changed: false };
	let changed = false;
	const next = sections.map((section) => {
		if (section.id !== "temporary_address") return section;
		const fields = section.fields.map((f) => {
			if ((f.id === "stay_street" || f.id === "stay_city") && f.required) {
				changed = true;
				return { ...f, required: false };
			}
			return f;
		});
		return { ...section, fields };
	});
	return { next, changed };
}

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		const service = await ctx.db
			.query("services")
			.withIndex("by_slug", (q) => q.eq("slug", "consular-notification"))
			.unique();

		if (!service) {
			return { status: "service_not_found" as const };
		}

		const topLevel = syncJoinedDocuments(service.joinedDocuments as any);
		const formSchemaDocs = syncJoinedDocuments(
			service.formSchema?.joinedDocuments as any,
		);
		const sectionsResult = syncTemporaryAddressFields(
			service.formSchema?.sections as any,
		);

		if (
			!topLevel.changed &&
			!formSchemaDocs.changed &&
			!sectionsResult.changed
		) {
			return { status: "already_up_to_date" as const, serviceId: service._id };
		}

		const nextFormSchema = service.formSchema
			? {
					...service.formSchema,
					joinedDocuments: formSchemaDocs.next,
					...(sectionsResult.next ? { sections: sectionsResult.next } : {}),
				}
			: undefined;

		await ctx.db.patch(service._id, {
			joinedDocuments: topLevel.next as any,
			...(nextFormSchema ? { formSchema: nextFormSchema as any } : {}),
			updatedAt: Date.now(),
		});

		return {
			status: "patched" as const,
			serviceId: service._id,
			topLevelDocsChanged: topLevel.changed,
			formSchemaDocsChanged: formSchemaDocs.changed,
			temporaryAddressFieldsChanged: sectionsResult.changed,
		};
	},
});
