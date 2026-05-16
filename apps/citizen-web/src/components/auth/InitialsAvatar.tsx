import { cn } from "@/lib/utils";

export function InitialsAvatar({
	firstName,
	lastName,
	size = 44,
	className,
}: {
	firstName?: string | null;
	lastName?: string | null;
	size?: number;
	className?: string;
}) {
	const initials =
		`${(firstName ?? "")[0] ?? ""}${(lastName ?? "")[0] ?? ""}`.toUpperCase() ||
		"G";
	const stripeHeight = Math.max(3, Math.round(size * 0.09));

	return (
		<div
			className={cn(
				"relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gabon-blue font-semibold text-white",
				className,
			)}
			style={{
				width: size,
				height: size,
				fontSize: Math.round(size * 0.4),
				boxShadow: "0 8px 24px -10px rgba(0,114,185,0.5)",
				letterSpacing: "-0.02em",
			}}
			aria-hidden="true"
		>
			{initials}
			<span
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 flex"
				style={{ height: stripeHeight }}
			>
				<span className="flex-1 bg-gabon-green" />
				<span className="flex-1 bg-gabon-yellow" />
				<span className="flex-1 bg-gabon-blue" />
			</span>
		</div>
	);
}
