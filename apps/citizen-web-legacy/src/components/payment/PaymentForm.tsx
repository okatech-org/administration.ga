"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useConvexActionQuery } from "@/integrations/convex/hooks";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentFormProps {
	requestId: Id<"requests">;
	amount: number;
	currency: string;
	serviceName: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

// Inner form component that uses Stripe hooks
function CheckoutForm({
	amount,
	currency,
	serviceName,
	onSuccess,
	onCancel,
}: {
	amount: number;
	currency: string;
	serviceName: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}) {
	const { t } = useTranslation();
	const stripe = useStripe();
	const elements = useElements();
	const [isProcessing, setIsProcessing] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		setIsProcessing(true);
		setErrorMessage(null);

		const { error, paymentIntent } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: window.location.origin + "/payment/success",
			},
			redirect: "if_required",
		});

		if (error) {
			setErrorMessage(
				error.message || t("payment.error"),
			);
			setPaymentStatus("error");
			toast.error(error.message);
		} else if (paymentIntent && paymentIntent.status === "succeeded") {
			setPaymentStatus("success");
			toast.success(t("payment.success"));
			onSuccess?.();
		} else {
			// Payment requires additional action or is processing
			setPaymentStatus("idle");
		}

		setIsProcessing(false);
	};

	// Format amount for display (amount is in euros)
	const formatAmount = (euros: number, curr: string) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: curr.toUpperCase(),
		}).format(euros);
	};

	if (paymentStatus === "success") {
		return (
			<Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
				<CardContent className="pt-6 text-center">
					<CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
						{t("payment.successTitle")}
					</h3>
					<p className="text-sm text-green-600 dark:text-green-500 mt-2">
						{t(
							"payment.successDescription",
							"Votre paiement a été traité avec succès.",
						)}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						{t("payment.title")}
					</CardTitle>
					<CardDescription>
						{serviceName} - {formatAmount(amount, currency)}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<PaymentElement
						options={{
							layout: "tabs",
						}}
					/>

					{errorMessage && (
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					)}

					<div className="flex gap-2 pt-4">
						{onCancel && (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isProcessing}
								className="flex-1"
							>
								{t("common.cancel")}
							</Button>
						)}
						<Button
							type="submit"
							disabled={!stripe || !elements || isProcessing}
							className="flex-1"
						>
							{isProcessing ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{t("payment.processing")}
								</>
							) : (
								t("payment.pay", "Payer {{amount}}", {
									amount: formatAmount(amount, currency),
								})
							)}
						</Button>
					</div>

					<p className="text-xs text-muted-foreground text-center">
						{t(
							"payment.secure",
							"Paiement sécurisé par Stripe. Vos informations sont protégées.",
						)}
					</p>
				</CardContent>
			</Card>
		</form>
	);
}

// Main wrapper component
export function PaymentForm({
	requestId,
	amount,
	currency,
	serviceName,
	onSuccess,
	onCancel,
}: PaymentFormProps) {
	const { t } = useTranslation();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { mutateAsync: createPaymentIntent } = useConvexActionQuery(
		api.functions.payments.createPaymentIntent,
	);

	useEffect(() => {
		const initPayment = async () => {
			try {
				const result = await createPaymentIntent({ requestId });
				setClientSecret(result.clientSecret);
			} catch (err: any) {
				setError(
					err.message || t("payment.initError"),
				);
				toast.error(err.message);
			} finally {
				setIsLoading(false);
			}
		};

		initPayment();
	}, [requestId, createPaymentIntent, t]);

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Alert variant="destructive">
				<XCircle className="h-4 w-4" />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	if (!clientSecret) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					{t("payment.noSecret")}
				</AlertDescription>
			</Alert>
		);
	}

	const options: StripeElementsOptions = {
		clientSecret,
		appearance: {
			theme: "stripe",
			variables: {
				colorPrimary: "#0f172a",
				borderRadius: "8px",
			},
		},
	};

	return (
		<Elements stripe={stripePromise} options={options}>
			<CheckoutForm
				amount={amount}
				currency={currency}
				serviceName={serviceName}
				onSuccess={onSuccess}
				onCancel={onCancel}
			/>
		</Elements>
	);
}
