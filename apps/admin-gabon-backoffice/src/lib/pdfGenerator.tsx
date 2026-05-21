import type { Doc } from "@convex/_generated/dataModel";
import type { GenerationData } from "./pdfGenerator.types";

export type { GenerationData } from "./pdfGenerator.types";

export const downloadPDF = async (
	template: Doc<"documentTemplates">,
	data: GenerationData,
	filename: string,
	lang: "fr" | "en" = "fr",
): Promise<void> => {
	const { generatePDFBlob } = await import("./pdfGenerator.renderer");
	const blob = await generatePDFBlob(template, data, lang);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
