export interface LocalizedString {
	fr: string;
	en?: string;
}

export interface TemplateContent {
	header?: {
		showLogo: boolean;
		showOrgName: boolean;
		showOrgAddress: boolean;
		title?: LocalizedString;
		subtitle?: LocalizedString;
	};
	body: Array<{
		type: "paragraph" | "heading" | "list" | "table" | "signature";
		content: LocalizedString;
		style?: {
			fontSize?: number;
			fontWeight?: "normal" | "bold";
			textAlign?: "left" | "center" | "right" | "justify";
			marginTop?: number;
			marginBottom?: number;
		};
	}>;
	footer?: {
		showDate: boolean;
		showSignature: boolean;
		signatureTitle?: LocalizedString;
		additionalText?: LocalizedString;
	};
}

export interface GenerationData {
	user?: {
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	profile?: {
		identity?: {
			firstName?: string;
			lastName?: string;
			dateOfBirth?: string;
			placeOfBirth?: string;
			gender?: string;
		};
		contact?: {
			email?: string;
			phone?: string;
			address?: string;
			city?: string;
			country?: string;
		};
	};
	request?: {
		reference?: string;
		createdAt?: number;
		status?: string;
		estimatedDays?: number;
	};
	formData?: Record<string, unknown>;
	org?: {
		name?: string;
		address?: string;
		phone?: string;
		email?: string;
	};
	service?: {
		name?: LocalizedString;
	};
	system?: {
		currentDate?: string;
		referenceNumber?: string;
	};
}
