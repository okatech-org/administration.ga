"use client";

import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	Loader2,
	Phone,
	Shield,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PinEntryInline } from "@/components/auth/PinEntryInline";
import { SignInLayout } from "@/components/auth/SignInLayout";
import { Button } from "@/components/ui/button";

type Stage = "intro" | "create" | "confirm" | "success";

const PIN_LENGTH = 6;

export default function SetupPinPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/my-space";

	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const pinStatus = useQuery(
		api.functions.pin.getPinStatus,
		isAuthenticated ? {} : "skip",
	);
	const createPin = useMutation(api.functions.pin.createPin);

	const [stage, setStage] = useState<Stage>("intro");
	const [pin, setPin] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Redirect away if user is not authenticated or already has a PIN
	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) {
			router.replace(`/sign-in?redirect=${encodeURIComponent("/setup-pin")}`);
			return;
		}
		if (pinStatus?.hasPin) {
			router.replace(redirectTo);
		}
	}, [authLoading, isAuthenticated, pinStatus, router, redirectTo]);

	// Auto-advance create → confirm when 6 digits typed
	useEffect(() => {
		if (stage === "create" && pin.length === PIN_LENGTH) {
			const id = setTimeout(() => setStage("confirm"), 240);
			return () => clearTimeout(id);
		}
	}, [stage, pin]);

	const submitConfirmedPin = useCallback(async () => {
		setSaving(true);
		setError(null);
		try {
			await createPin({ pin });
			setStage("success");
		} catch (err) {
			console.error("createPin error:", err);
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes("PIN_RECENT_OTP_REQUIRED")) {
				setError(t("errors.auth.setupPin.otpRequired"));
			} else if (message.includes("PIN_ALREADY_EXISTS")) {
				router.replace(redirectTo);
			} else {
				setError(t("errors.auth.setupPin.genericError"));
			}
		} finally {
			setSaving(false);
		}
	}, [createPin, pin, t, router, redirectTo]);

	// Auto-validate confirm stage when 6 digits typed
	useEffect(() => {
		if (stage !== "confirm" || confirm.length !== PIN_LENGTH) return;
		if (confirm !== pin) {
			setError(t("errors.auth.setupPin.mismatch"));
			const reset = setTimeout(() => setConfirm(""), 600);
			const clear = setTimeout(() => setError(null), 1200);
			return () => {
				clearTimeout(reset);
				clearTimeout(clear);
			};
		}
		const id = setTimeout(submitConfirmedPin, 220);
		return () => clearTimeout(id);
	}, [stage, confirm, pin, t, submitConfirmedPin]);

	// After success, redirect
	useEffect(() => {
		if (stage !== "success") return;
		const id = setTimeout(() => router.replace(redirectTo), 1500);
		return () => clearTimeout(id);
	}, [stage, router, redirectTo]);

	if (authLoading || pinStatus === undefined) {
		return (
			<SignInLayout>
				<div className="flex flex-col items-center gap-3 py-16">
					<Loader2 className="size-8 animate-spin text-gabon-blue" />
					<p className="text-sm text-muted-foreground">
						{t("common.loading")}
					</p>
				</div>
			</SignInLayout>
		);
	}

	if (stage === "intro") {
		const benefits = [
			{
				icon: Check,
				title: t("errors.auth.setupPin.benefitFastTitle"),
				subtitle: t("errors.auth.setupPin.benefitFastSubtitle"),
			},
			{
				icon: Shield,
				title: t("errors.auth.setupPin.benefitLocalTitle"),
				subtitle: t("errors.auth.setupPin.benefitLocalSubtitle"),
			},
			{
				icon: Phone,
				title: t("errors.auth.setupPin.benefitFallbackTitle"),
				subtitle: t("errors.auth.setupPin.benefitFallbackSubtitle"),
			},
		];

		return (
			<SignInLayout
				eyebrow={
					<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gabon-yellow-tint px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
						<Shield className="size-3" />
						{t("errors.auth.setupPin.eyebrowRequired")}
					</span>
				}
				title={t("errors.auth.setupPin.title")}
				subtitle={t("errors.auth.setupPin.subtitle")}
			>
				<ul className="flex flex-col gap-3 p-0">
					{benefits.map((b) => (
						<li
							key={b.title}
							className="flex gap-3 rounded-xl border bg-muted/40 p-3.5"
						>
							<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gabon-blue-tint text-gabon-blue">
								<b.icon className="size-4" />
							</span>
							<div>
								<div className="text-sm font-medium">{b.title}</div>
								<div className="mt-0.5 text-xs text-muted-foreground">
									{b.subtitle}
								</div>
							</div>
						</li>
					))}
				</ul>

				<Button
					type="button"
					size="lg"
					className="h-12 w-full"
					onClick={() => {
						setPin("");
						setConfirm("");
						setError(null);
						setStage("create");
					}}
				>
					{t("errors.auth.setupPin.cta")}
					<ArrowRight className="ml-1.5 size-4" />
				</Button>
			</SignInLayout>
		);
	}

	if (stage === "success") {
		return (
			<SignInLayout>
				<div className="flex flex-col items-center gap-5 py-12 text-center">
					<div className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
						<CheckCircle2 className="size-10" strokeWidth={2.5} />
					</div>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							{t("errors.auth.setupPin.successTitle")}
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							{t("errors.auth.setupPin.successSubtitle")}
						</p>
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Loader2 className="size-3.5 animate-spin" />
						{t("errors.auth.setupPin.redirecting")}
					</div>
				</div>
			</SignInLayout>
		);
	}

	const isConfirm = stage === "confirm";

	return (
		<SignInLayout
			onBack={() => {
				if (isConfirm) {
					setConfirm("");
					setError(null);
					setStage("create");
				} else {
					setPin("");
					setError(null);
					setStage("intro");
				}
			}}
			eyebrow={
				<div className="flex items-center gap-3">
					<span className="font-mono text-xs text-muted-foreground">
						{isConfirm
							? t("errors.auth.setupPin.step2of2")
							: t("errors.auth.setupPin.step1of2")}
					</span>
					<div className="flex gap-1">
						<span
							className="h-1.5 rounded-full bg-gabon-blue transition-all"
							style={{ width: isConfirm ? 12 : 22, opacity: isConfirm ? 0.55 : 1 }}
						/>
						<span
							className="h-1.5 rounded-full transition-all"
							style={{
								width: isConfirm ? 22 : 12,
								background: isConfirm
									? "var(--gabon-blue-hex)"
									: "var(--border)",
							}}
						/>
					</div>
				</div>
			}
			title={
				isConfirm
					? t("errors.auth.setupPin.confirmTitle")
					: t("errors.auth.setupPin.createTitle")
			}
			subtitle={
				isConfirm
					? t("errors.auth.setupPin.confirmSubtitle")
					: t("errors.auth.setupPin.createSubtitle")
			}
		>
			<PinEntryInline
				value={isConfirm ? confirm : pin}
				onChange={isConfirm ? setConfirm : setPin}
				onSubmit={() => {}}
				loading={saving}
				error={error}
				autoSubmit={false}
			/>

			<div
				className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground"
				style={{ borderColor: "var(--border)" }}
			>
				<Shield className="mt-0.5 size-4 shrink-0" />
				<span>{t("errors.auth.setupPin.info")}</span>
			</div>

			{error && stage === "confirm" && (
				<div className="flex items-center justify-center gap-1.5 text-sm text-destructive">
					<AlertTriangle className="size-4" />
					{error}
				</div>
			)}

			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="text-muted-foreground"
				onClick={() => {
					setPin("");
					setConfirm("");
					setError(null);
					setStage("intro");
				}}
			>
				<ArrowLeft className="mr-1 size-3.5" />
				{t("errors.auth.setupPin.restart")}
			</Button>
		</SignInLayout>
	);
}
