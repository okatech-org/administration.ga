import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { KeyRound, Loader2, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	SettingsSectionHeader,
} from "@/components/shared/settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PinMode = "idle" | "create" | "modify" | "delete";

export function PinCodeSection() {
	const { t } = useTranslation();
	const pinStatus = useQuery(api.functions.pin.getPinStatus, {});
	const createPinMut = useMutation(api.functions.pin.createPin);
	const updatePinMut = useMutation(api.functions.pin.updatePin);
	const deletePinMut = useMutation(api.functions.pin.deletePin);

	const [mode, setMode] = useState<PinMode>("idle");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);
	const [pinLoading, setPinLoading] = useState(false);

	const resetForm = () => {
		setMode("idle");
		setNewPin("");
		setConfirmPin("");
		setCurrentPin("");
		setPinError(null);
	};

	const handlePinInput = (
		value: string,
		setter: (v: string) => void,
	) => {
		setter(value.replace(/\D/g, "").slice(0, 6));
	};

	const handleCreatePin = async () => {
		if (newPin.length !== 6 || newPin !== confirmPin) {
			setPinError(t("settings.pin.mismatch"));
			return;
		}
		setPinLoading(true);
		setPinError(null);
		try {
			await createPinMut({ pin: newPin });
			toast.success(t("settings.pin.createSuccess"));
			resetForm();
		} catch (e: unknown) {
			const err = e as Error;
			setPinError(
				err.message?.includes("OTP")
					? t("settings.pin.otpRequired")
					: (err.message ?? t("common.error")),
			);
		} finally {
			setPinLoading(false);
		}
	};

	const handleModifyPin = async () => {
		if (newPin.length !== 6 || newPin !== confirmPin) {
			setPinError(t("settings.pin.mismatch"));
			return;
		}
		setPinLoading(true);
		setPinError(null);
		try {
			await updatePinMut({ currentPin, newPin });
			toast.success(t("settings.pin.modifySuccess"));
			resetForm();
		} catch (e: unknown) {
			const err = e as Error;
			setPinError(
				err.message?.includes("INVALID")
					? t("settings.pin.invalidCurrent")
					: (err.message ?? t("common.error")),
			);
		} finally {
			setPinLoading(false);
		}
	};

	const handleDeletePin = async () => {
		setPinLoading(true);
		setPinError(null);
		try {
			await deletePinMut({});
			toast.success(t("settings.pin.deleteSuccess"));
			resetForm();
		} catch (e: unknown) {
			const err = e as Error;
			setPinError(err.message ?? t("common.error"));
		} finally {
			setPinLoading(false);
		}
	};

	if (pinStatus === undefined) return null;

	const daysLeft = pinStatus.lastOtpVerifiedAt
		? Math.max(
				0,
				Math.floor(
					(pinStatus.lastOtpVerifiedAt +
						90 * 24 * 60 * 60 * 1000 -
						Date.now()) /
						(24 * 60 * 60 * 1000),
				),
			)
		: 0;

	const pinCreatedDate = pinStatus.pinCreatedAt
		? new Date(pinStatus.pinCreatedAt).toLocaleDateString("fr-FR")
		: "—";

	return (
		<div>
			<SettingsSectionHeader
				title={t("settings.pin.title")}
				description={
					pinStatus.hasPin
						? t("settings.pin.activeSince", { date: pinCreatedDate })
						: t("settings.pin.createDesc")
				}
			/>

			<div className="py-3 space-y-3">
				{/* Idle — pas de PIN */}
				{!pinStatus.hasPin && mode === "idle" && (
					<Button
						variant="outline"
						onClick={() => setMode("create")}
						className="gap-2 rounded-xl"
					>
						<Lock className="h-4 w-4" />
						{t("settings.pin.create")}
					</Button>
				)}

				{/* Idle — PIN actif */}
				{pinStatus.hasPin && mode === "idle" && (
					<div className="space-y-2">
						{daysLeft > 0 && daysLeft <= 15 && (
							<p className="text-xs text-warning">
								{t("settings.pin.otpExpiryWarning", { days: daysLeft })}
							</p>
						)}
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setMode("modify")}
								className="gap-1.5"
							>
								<KeyRound className="h-3.5 w-3.5" />
								{t("common.modify")}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setMode("delete")}
								className="gap-1.5 text-destructive"
							>
								<Trash2 className="h-3.5 w-3.5" />
								{t("common.delete")}
							</Button>
						</div>
					</div>
				)}

				{/* Formulaire creation */}
				{mode === "create" && (
					<PinForm
						fields={[
							{
								label: t("settings.pin.newPin"),
								value: newPin,
								onChange: (v) => handlePinInput(v, setNewPin),
							},
							{
								label: t("settings.pin.confirm"),
								value: confirmPin,
								onChange: (v) => handlePinInput(v, setConfirmPin),
							},
						]}
						error={pinError}
						loading={pinLoading}
						disabled={newPin.length !== 6 || newPin !== confirmPin}
						onSubmit={handleCreatePin}
						onCancel={resetForm}
						submitLabel={t("common.save")}
					/>
				)}

				{/* Formulaire modification */}
				{mode === "modify" && (
					<PinForm
						fields={[
							{
								label: t("settings.pin.currentPin"),
								value: currentPin,
								onChange: (v) => handlePinInput(v, setCurrentPin),
							},
							{
								label: t("settings.pin.newPin"),
								value: newPin,
								onChange: (v) => handlePinInput(v, setNewPin),
							},
							{
								label: t("settings.pin.confirm"),
								value: confirmPin,
								onChange: (v) => handlePinInput(v, setConfirmPin),
							},
						]}
						error={pinError}
						loading={pinLoading}
						disabled={pinLoading}
						onSubmit={handleModifyPin}
						onCancel={resetForm}
						submitLabel={t("common.save")}
					/>
				)}

				{/* Confirmation suppression */}
				{mode === "delete" && (
					<div className="space-y-3 p-3 rounded-xl bg-destructive/5">
						<p className="text-sm">{t("settings.pin.deleteConfirm")}</p>
						{pinError && (
							<p className="text-xs text-destructive">{pinError}</p>
						)}
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="destructive"
								onClick={handleDeletePin}
								disabled={pinLoading}
							>
								{pinLoading && (
									<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
								)}
								{t("common.delete")}
							</Button>
							<Button size="sm" variant="ghost" onClick={resetForm}>
								{t("common.cancel")}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Sous-composant formulaire PIN ───────────────────────────

interface PinField {
	label: string;
	value: string;
	onChange: (value: string) => void;
}

function PinForm({
	fields,
	error,
	loading,
	disabled,
	onSubmit,
	onCancel,
	submitLabel,
}: {
	fields: PinField[];
	error: string | null;
	loading: boolean;
	disabled: boolean;
	onSubmit: () => void;
	onCancel: () => void;
	submitLabel: string;
}) {
	const { t } = useTranslation();

	return (
		<div className="space-y-3">
			{fields.map((field) => (
				<div key={field.label} className="space-y-1">
					<Label className="text-xs">{field.label}</Label>
					<Input
						type="password"
						inputMode="numeric"
						maxLength={6}
						value={field.value}
						onChange={(e) => field.onChange(e.target.value)}
						placeholder="••••••"
						className="text-center text-lg tracking-[0.3em] font-mono"
					/>
				</div>
			))}
			{error && <p className="text-xs text-destructive">{error}</p>}
			<div className="flex gap-2">
				<Button size="sm" onClick={onSubmit} disabled={loading || disabled}>
					{loading && (
						<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
					)}
					{submitLabel}
				</Button>
				<Button size="sm" variant="ghost" onClick={onCancel}>
					{t("common.cancel")}
				</Button>
			</div>
		</div>
	);
}
