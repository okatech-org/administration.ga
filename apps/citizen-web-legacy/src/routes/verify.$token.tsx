import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Shield,
	User,
	XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConvexQuery } from "@/integrations/convex/hooks";

export const Route = createFileRoute("/verify/$token")({
	component: VerifyDocumentPage,
});

function VerifyDocumentPage() {
	const { token } = Route.useParams();
	const { t, i18n } = useTranslation();

	const { data: result } = useConvexQuery(
		api.functions.documentVerifications.verifyDocument,
		{
			token,
		},
	);

	if (result === undefined) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="pt-6">
						<div className="flex items-center justify-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
						</div>
						<p className="text-center text-muted-foreground mt-4">
							{t("verify.loading")}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-4">
				{/* Header */}
				<div className="text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
						<Shield className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						🇬🇦 Consulat du Gabon
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{t("verify.title")}
					</p>
				</div>

				{/* Result Card */}
				<Card
					className={`border-2 ${result.valid ? "border-green-500" : "border-red-500"}`}
				>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2">
							{result.valid ? (
								<>
									<CheckCircle2 className="h-6 w-6 text-green-500" />
									<span className="text-green-700 dark:text-green-400">
										{t("verify.valid")}
									</span>
								</>
							) : (
								<>
									<XCircle className="h-6 w-6 text-red-500" />
									<span className="text-red-700 dark:text-red-400">
										{t("verify.invalid")}
									</span>
								</>
							)}
						</CardTitle>
					</CardHeader>

					<CardContent className="space-y-4">
						{result.valid && result.document && result.issuer ? (
							<>
								{/* Document Info */}
								<div className="space-y-3">
									<div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
										<FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-xs text-muted-foreground">
												{t("verify.documentType")}
											</p>
											<p className="font-medium">{result.document.title}</p>
										</div>
									</div>

									<div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
										<User className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-xs text-muted-foreground">
												{t("verify.holder")}
											</p>
											<p className="font-medium">
												{result.document.holderName}
											</p>
										</div>
									</div>

									<div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
										<Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-xs text-muted-foreground">
												{t("verify.issuedOn")}
											</p>
											<p className="font-medium">
												{new Date(
													result.document.generatedAt,
												).toLocaleDateString(
													i18n.language === "fr" ? "fr-FR" : "en-US",
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)}
											</p>
										</div>
									</div>

									{result.document.expiresAt && (
										<div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
											<Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<p className="text-xs text-muted-foreground">
													{t("verify.expiresOn")}
												</p>
												<p className="font-medium">
													{new Date(
														result.document.expiresAt,
													).toLocaleDateString(
														i18n.language === "fr" ? "fr-FR" : "en-US",
														{
															year: "numeric",
															month: "long",
															day: "numeric",
														},
													)}
												</p>
											</div>
										</div>
									)}
								</div>

								<div className="pt-3 border-t">
									<p className="text-xs text-muted-foreground mb-2">
										{t("verify.issuedBy")}
									</p>
									<span className="font-medium">{result.issuer.name}</span>
								</div>

								{/* Verification count */}
								<div className="text-center text-xs text-muted-foreground pt-2">
									{t(
										"verify.verificationCount",
										"Ce document a été vérifié {{count}} fois",
										{
											count: result.document.verificationCount,
										},
									)}
								</div>
							</>
						) : (
							<>
								<div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
									<AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
									<div>
										<p className="font-medium text-red-700 dark:text-red-400">
											{result.error}
										</p>
										{result.revokedAt && (
											<p className="text-sm text-red-600 dark:text-red-500 mt-1">
												{t("verify.revokedOn")}:{" "}
												{new Date(result.revokedAt).toLocaleDateString()}
											</p>
										)}
										{result.revokedReason && (
											<p className="text-sm text-red-600 dark:text-red-500">
												{t("verify.reason")}: {result.revokedReason}
											</p>
										)}
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="text-center text-xs text-muted-foreground">
					<p>
						{t(
							"verify.footer",
							"Ce service de vérification est fourni par le Consulat Général du Gabon.",
						)}
					</p>
				</div>
			</div>
		</div>
	);
}
