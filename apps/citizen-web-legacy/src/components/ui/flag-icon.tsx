"use client";

import type { CountryCode } from "@convex/lib/constants";
import { cn } from "@/lib/utils";

interface FlagIconProps {
	countryCode: CountryCode;
	size?: number;
	className?: string;
}

export function FlagIcon({ countryCode, className, size = 40 }: FlagIconProps) {
	return countryCode ? (
		<img
			src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
			alt={countryCode}
			width={size}
			height={size}
			className={cn("w-5 !h-auto", className)}
		/>
	) : null;
}
