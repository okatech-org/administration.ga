/**
 * IDNSignInButton — Shared "Se connecter avec IDN" button.
 * Used in sign-in, sign-up, and InlineAuth forms.
 */

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface IDNSignInButtonProps {
	callbackURL?: string;
}

export function IDNSignInButton({
	callbackURL = "/",
}: IDNSignInButtonProps) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);

	const handleIDNLogin = async () => {
		setLoading(true);
		try {
			await authClient.signIn.oauth2({
				providerId: "idn",
				callbackURL,
			});
		} catch {
			setLoading(false);
		}
	};

	return (
		<>
			{/* Divider */}
			<div className="relative flex items-center gap-4 py-1">
				<div className="h-px flex-1 bg-border/50" />
				<span className="text-xs text-muted-foreground uppercase tracking-wider">
					{t("errors.auth.orDivider")}
				</span>
				<div className="h-px flex-1 bg-border/50" />
			</div>

			{/* IDN Button */}
			<Button
				type="button"
				variant="outline"
				className="w-full border-border/50 hover:bg-accent/50 font-medium gap-2"
				onClick={handleIDNLogin}
				disabled={true}
			>
				{loading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<img
						src="/idn-logo.svg"
						alt="IDN"
						className="h-5 w-5"
						onError={(e) => {
							// Fallback if logo doesn't exist
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				)}
				{t("errors.auth.signInWithIDN")}
			</Button>
		</>
	);
}
