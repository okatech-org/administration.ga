import { Link } from "@tanstack/react-router";
import {
	LogIn,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function HeaderUser() {
	const { t } = useTranslation();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) return null;

	if (!session) {
		return (
			<Button asChild variant="ghost" size="sm">
				<Link to="/sign-in/$" params={{}}>
					<LogIn className="w-4 h-4 mr-2" />
					{t("header.nav.signIn")}
				</Link>
			</Button>
		);
	}

	return (
		<Button asChild variant="ghost" size="sm">
			<Link to="/my-space">
				<User className="w-4 h-4 mr-2" />
				{t("header.nav.mySpace")}
			</Link>
		</Button>
	);
}
