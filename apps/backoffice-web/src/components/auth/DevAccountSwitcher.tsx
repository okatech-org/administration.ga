import { Bug, Loader2, LogIn, UserCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { authClient } from "@/lib/auth-client";

interface DevAccount {
	label: string;
	email: string;
	group: string;
	role?: string;
}

interface DevAccountGroup {
	group: string;
	accounts: DevAccount[];
}

/** Parse les comptes dev depuis NEXT_PUBLIC_DEV_ACCOUNTS et les groupe par group. */
function parseDevAccounts(): DevAccountGroup[] {
	try {
		const raw = process.env.NEXT_PUBLIC_DEV_ACCOUNTS;
		if (!raw) return [];
		const accounts: DevAccount[] = JSON.parse(raw);
		const grouped = new Map<string, DevAccount[]>();
		for (const account of accounts) {
			const group = account.group || "Dev";
			if (!grouped.has(group)) grouped.set(group, []);
			grouped.get(group)!.push(account);
		}
		return Array.from(grouped.entries()).map(([group, accounts]) => ({ group, accounts }));
	} catch {
		console.error("[DevAccountSwitcher] Impossible de parser NEXT_PUBLIC_DEV_ACCOUNTS");
		return [];
	}
}

/**
 * SÉCURITÉ : Triple gate pour éviter toute fuite en production.
 */
export function DevAccountSwitcher() {
	if (process.env.NODE_ENV === "production") return null;
	if (process.env.NODE_ENV !== "development") return null;

	return <DevAccountSwitcherInner />;
}

function DevAccountSwitcherInner() {
	const { data: session } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const devAccounts = useMemo(() => parseDevAccounts(), []);

	const currentEmail = session?.user?.email;

	if (devAccounts.length === 0) return null;

	const handleSignIn = async (account: DevAccount) => {
		setLoading(account.email);
		setError(null);

		try {
			if (session) {
				await authClient.signOut();
				await new Promise((r) => setTimeout(r, 300));
			}

			// Step 1: Get temp password from Convex via proxy
			const devRes = await fetch("/api/dev/sign-in", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: account.email }),
			});

			if (!devRes.ok) {
				const data = await devRes.json().catch(() => ({}));
				throw new Error(data.error || `Échec connexion (${devRes.status})`);
			}

			const { tempPassword } = await devRes.json();

			// Step 2: Sign in via Better Auth (goes through /api/auth/* proxy → crossDomain flow)
			const signInResult = await authClient.signIn.email({
				email: account.email,
				password: tempPassword,
			});

			if (signInResult.error) {
				throw new Error(signInResult.error.message || "Échec de connexion Better Auth");
			}

			setOpen(false);
			toast.success(`Connecté en tant que ${account.label}`, {
				description: account.email,
			});
			await new Promise((r) => setTimeout(r, 500));
			window.location.reload();
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Erreur de connexion";
			setError(message);
			toast.error("Échec de connexion", { description: message });
		} finally {
			setLoading(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className="fixed bottom-4 left-4 z-9999 flex items-center gap-1.5 rounded-full bg-violet-500 px-3 py-2 text-xs font-bold text-black transition-all hover:bg-violet-400 hover:scale-105 active:scale-95"
					title="Dev Account Switcher"
				>
					<Bug className="size-4" />
					<span>DEV</span>
				</button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md p-0">
				<DialogHeader className="px-5 pt-5 pb-0">
					<DialogTitle className="flex items-center gap-2">
						<Bug className="size-5 text-amber-500" />
						Dev Account Switcher
					</DialogTitle>
					<DialogDescription>
						Connexion rapide aux comptes de test.
						{currentEmail && (
							<span className="mt-1 block text-xs text-emerald-500">
								Connecté : {currentEmail}
							</span>
						)}
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="mx-5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{error}
					</div>
				)}

				<ScrollArea className="max-h-[60vh]">
					<div className="flex flex-col gap-1 px-5 pb-5">
						{devAccounts.map((group, gi) => (
							<div key={group.group}>
								<div
									className={`sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 text-xs font-semibold text-muted-foreground tracking-wide ${gi > 0 ? "mt-2 border-t border-border pt-3" : ""}`}
								>
									{group.group}
								</div>

								<div className="flex flex-col gap-1">
									{group.accounts.map((account) => {
										const isCurrentUser = currentEmail === account.email;
										const isLoading = loading === account.email;

										return (
											<button
												type="button"
												key={account.email}
												disabled={isLoading || isCurrentUser}
												onClick={() => handleSignIn(account)}
												className={`group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
													isCurrentUser
														? "border-emerald-500/30 bg-emerald-500/10 cursor-default"
														: "border-border hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer"
												}`}
											>
												<div
													className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
														isCurrentUser
															? "bg-emerald-500/20 text-emerald-500"
															: "bg-muted text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-500"
													}`}
												>
													<UserCircle className="size-4" />
												</div>

												<div className="flex-1 min-w-0">
													<div className="font-medium text-sm leading-tight">
														{account.label}
														{isCurrentUser && (
															<span className="ml-2 text-xs text-emerald-500">
																● actif
															</span>
														)}
														{account.role && (
															<span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
																{account.role}
															</span>
														)}
													</div>
													<div className="text-[11px] text-muted-foreground truncate">
														{account.email}
													</div>
												</div>

												{!isCurrentUser && (
													<div className="shrink-0">
														{isLoading ? (
															<Loader2 className="size-4 animate-spin text-amber-500" />
														) : (
															<LogIn className="size-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
														)}
													</div>
												)}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
