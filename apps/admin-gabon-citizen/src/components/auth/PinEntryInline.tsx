"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NumPad } from "@/components/onboarding/ui/NumPad";
import { OtpInput } from "@/components/onboarding/ui/OtpInput";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return isMobile;
}

type PinEntryInlineProps = {
	value: string;
	onChange: (next: string) => void;
	onSubmit: (pin: string) => void | Promise<void>;
	loading?: boolean;
	error?: string | null;
	label?: string;
	autoSubmit?: boolean;
};

/**
 * Saisie inline du PIN à 6 chiffres :
 * - desktop : clavier physique via OtpInput
 * - mobile : NumPad custom, OtpInput en readOnly
 * Auto-submit dès que 6 chiffres saisis (sauf si autoSubmit=false).
 */
export function PinEntryInline({
	value,
	onChange,
	onSubmit,
	loading,
	error,
	label,
	autoSubmit = true,
}: PinEntryInlineProps) {
	const { t } = useTranslation();
	const isMobile = useIsMobile();

	useEffect(() => {
		if (!autoSubmit) return;
		if (value.length === PIN_LENGTH && !loading) {
			const id = setTimeout(() => {
				onSubmit(value);
			}, 220);
			return () => clearTimeout(id);
		}
	}, [value, autoSubmit, loading, onSubmit]);

	const handleDigit = useCallback(
		(d: string) => {
			if (value.length >= PIN_LENGTH) return;
			onChange(value + d);
		},
		[value, onChange],
	);

	const handleBackspace = useCallback(() => {
		if (value.length === 0) return;
		onChange(value.slice(0, -1));
	}, [value, onChange]);

	return (
		<div className="flex flex-col items-center gap-3">
			{label && (
				<div className="self-start text-sm font-medium text-foreground">
					{label}
				</div>
			)}
			<div
				className={cn(
					"flex w-full justify-center",
					error && "animate-[shake_320ms_cubic-bezier(.36,.07,.19,.97)]",
				)}
			>
				<OtpInput
					key={error ? "err" : "ok"}
					value={value}
					onChange={onChange}
					length={PIN_LENGTH}
					mask
					readOnly={isMobile}
					autoFocus={!isMobile}
					disabled={loading}
					hasError={!!error}
					ariaLabel={t("onboarding.identity.pin.ariaCreate")}
				/>
			</div>

			{error && (
				<div className="flex items-center gap-1.5 text-sm text-destructive">
					<AlertTriangle className="size-4" />
					{error}
				</div>
			)}

			{loading && (
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Loader2 className="size-3.5 animate-spin" />
					{t("common.verifying")}
				</div>
			)}

			{isMobile && (
				<NumPad
					onDigit={handleDigit}
					onBackspace={handleBackspace}
					disabled={loading}
				/>
			)}

			<style jsx>{`
				@keyframes shake {
					10%, 90% { transform: translateX(-1px); }
					20%, 80% { transform: translateX(2px); }
					30%, 50%, 70% { transform: translateX(-5px); }
					40%, 60% { transform: translateX(5px); }
				}
			`}</style>
		</div>
	);
}
