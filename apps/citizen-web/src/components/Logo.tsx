import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Logo officiel Demarche.ga — République Gabonaise.
 *
 * Composé de :
 * - `.logo-mark` : carré bleu Gabon, lettre « G » blanche bold, bande
 *   tricolore en bas (vert / jaune / bleu) en pseudo-élément ::after.
 * - `.logo-text` : « Demarche.ga » + « République Gabonaise » en petit muted.
 *
 * Référence : prototype refonte-inscription/ — adapté ADMINISTRATION.GA.
 */
export function Logo({
	compact = false,
	href = "/",
	className,
}: {
	compact?: boolean;
	href?: string | null;
	className?: string;
}) {
	const content = (
		<span
			className={cn(
				"inline-flex items-center gap-2.5 leading-none",
				className,
			)}
		>
			<span className="relative grid size-8 place-items-center overflow-hidden rounded-[9px] bg-gabon-blue text-[15px] font-bold text-white">
				G
				<span
					aria-hidden="true"
					className="absolute inset-x-0 bottom-0 flex h-1.5"
				>
					<span className="flex-1 bg-gabon-green" />
					<span className="flex-1 bg-gabon-yellow" />
					<span className="flex-1 bg-gabon-blue" />
				</span>
			</span>
			{!compact && (
				<span className="flex flex-col leading-[1.1]">
					<strong className="text-[15px] font-bold">Demarche.ga</strong>
					<small className="text-[11px] font-normal text-muted-foreground">
						République Gabonaise
					</small>
				</span>
			)}
		</span>
	);

	if (!href) return content;
	return (
		<Link
			href={href}
			aria-label="Demarche.ga, accueil"
			className="inline-flex items-center"
		>
			{content}
		</Link>
	);
}
