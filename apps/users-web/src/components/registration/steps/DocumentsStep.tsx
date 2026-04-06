import type { Id } from "@convex/_generated/dataModel";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DocumentField } from "@/components/documents/DocumentField";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// Document configuration for profile - matches profile.documents schema keys
const PROFILE_DOCUMENTS = [
	{
		key: "passport" as const,
		labelKey: "profile.documents.passport",
		descriptionKey: "profile.documents.passportDesc",
		required: true,
	},
	{
		key: "proofOfAddress" as const,
		labelKey: "profile.documents.proofOfAddress",
		descriptionKey: "profile.documents.proofOfAddressDesc",
		required: true,
	},
	{
		key: "identityPhoto" as const,
		labelKey: "profile.documents.identityPhoto",
		descriptionKey: "profile.documents.identityPhotoDesc",
		required: true,
	},
	{
		key: "birthCertificate" as const,
		labelKey: "profile.documents.birthCertificate",
		descriptionKey: "profile.documents.birthCertificateDesc",
		required: false,
	},
	{
		key: "proofOfResidency" as const,
		labelKey: "profile.documents.proofOfResidency",
		descriptionKey: "profile.documents.proofOfResidencyDesc",
		required: false,
	},
];

// Type matching profile.documents schema
interface ProfileDocuments {
	passport?: Id<"documents">;
	identityPhoto?: Id<"documents">;
	proofOfAddress?: Id<"documents">;
	birthCertificate?: Id<"documents">;
	proofOfResidency?: Id<"documents">;
}

interface DocumentsStepProps {
	/** The profile ID for document ownership */
	profileId: Id<"profiles">;
	/** Current documents object from profile */
	documents?: ProfileDocuments;
	/** Callback when a document is uploaded or deleted */
	onDocumentChange?: (
		key: keyof ProfileDocuments,
		documentId: Id<"documents"> | undefined,
	) => void;
}

/**
 * DocumentsStep - Step component for profile wizard document management
 *
 * Uses DocumentField components for each document type.
 * Documents are stored in profile.documents as a typed object.
 */
export function DocumentsStep({
	documents,
	onDocumentChange,
}: DocumentsStepProps) {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						{t("profile.documents.title")}
					</CardTitle>
					<CardDescription>
						{t("profile.documents.description")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{PROFILE_DOCUMENTS.map((doc) => (
						<DocumentField
							key={doc.key}
							documentKey={doc.key}
							documentId={documents?.[doc.key]}
							label={`${t(doc.labelKey)}${doc.required ? " *" : ""}`}
							description={t(doc.descriptionKey)}
							onChange={(newId) => onDocumentChange?.(doc.key, newId)}
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
