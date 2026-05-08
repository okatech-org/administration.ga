"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";

// Logical card dimensions (CR80 @ ~300 DPI) — same source of truth as the
// desktop printer and the card designer (apps/agent-desktop card-types.ts).
const CARD_WIDTH = 1016;
const CARD_HEIGHT = 648;

// Mirror of cardElementValidator in convex/schemas/cardDesigns.ts.
export type CardCanvasElement = {
	id: string;
	type: "text" | "image" | "qrCode" | "barcode" | "rectangle" | "circle" | "line";
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	isLocked: boolean;
	isVisible: boolean;
	zIndex: number;
	textContent: string;
	fontName: string;
	fontSize: number;
	textColor: string;
	textAlignment: "left" | "center" | "right";
	isBold: boolean;
	isItalic: boolean;
	isDynamicField: boolean;
	fieldKey: string;
	imageData: string | null;
	mask?: "none" | "circle";
	fillColor: string;
	strokeColor: string;
	strokeWidth: number;
	cornerRadius: number;
	codeContent: string;
};

export type CardCanvasDesign = {
	backgroundColor: string;
	frontBackgroundImage: string | null;
	backBackgroundImage: string | null;
	backgroundOpacity: number;
	frontElements: CardCanvasElement[];
	backElements: CardCanvasElement[];
};

// Same shape as desktop CitizenProfileData — values are pre-formatted strings.
export type CardCanvasProfile = {
	firstName?: string;
	lastName?: string;
	dateOfBirth?: string;
	placeOfBirth?: string;
	nationality?: string;
	sex?: string;
	nip?: string;
	photoUrl?: string | null;
	cardNumber?: string;
	cardIssuedAt?: string;
	cardExpiresAt?: string;
	consulateName?: string;
	consulateCity?: string;
	consulateCountry?: string;
};

interface ConsularCardCanvasProps {
	design: CardCanvasDesign;
	face: "front" | "back";
	profile: CardCanvasProfile;
	className?: string;
}

/**
 * Renders a card design configured in the desktop print template editor.
 * Faithful to the printer output: positions, fonts, sizes and colors are taken
 * verbatim from the design; dynamic fields resolve from the citizen profile.
 *
 * The card is laid out at logical 1016×648 ("print pixels") and uniformly
 * scaled with CSS transform to fit its container — keeping the intrinsic
 * aspect ratio regardless of the widget size.
 */
export function ConsularCardCanvas({
	design,
	face,
	profile,
	className,
}: ConsularCardCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState<number>(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const update = () => setScale(el.clientWidth / CARD_WIDTH);
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const elements = face === "front" ? design.frontElements : design.backElements;
	const bgImage =
		face === "front" ? design.frontBackgroundImage : design.backBackgroundImage;

	const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

	return (
		<div
			ref={containerRef}
			className={cn("relative w-full overflow-hidden", className)}
			style={{
				aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`,
				backgroundColor: design.backgroundColor || "#ffffff",
			}}
		>
			<div
				className="absolute top-0 left-0"
				style={{
					width: CARD_WIDTH,
					height: CARD_HEIGHT,
					transform: `scale(${scale || 0.0001})`,
					transformOrigin: "top left",
					visibility: scale === 0 ? "hidden" : "visible",
				}}
			>
				{bgImage ? (
					<img
						src={bgImage}
						alt=""
						draggable={false}
						className="absolute inset-0 w-full h-full object-cover pointer-events-none"
						style={{ opacity: design.backgroundOpacity ?? 1 }}
						onError={(e) => {
							(e.currentTarget as HTMLImageElement).style.display = "none";
						}}
					/>
				) : null}

				{sortedElements.map((el) =>
					el.isVisible ? (
						<CardElement key={el.id} element={el} profile={profile} />
					) : null,
				)}
			</div>
		</div>
	);
}

// ─── Single element renderer ───────────────────────────────────────────────

function CardElement({
	element,
	profile,
}: {
	element: CardCanvasElement;
	profile: CardCanvasProfile;
}) {
	const baseStyle: CSSProperties = {
		position: "absolute",
		left: element.x,
		top: element.y,
		width: element.width,
		height: element.height,
		transform: element.rotation
			? `rotate(${element.rotation}deg)`
			: undefined,
		transformOrigin: "top left",
		zIndex: element.zIndex,
		pointerEvents: "none",
	};

	switch (element.type) {
		case "text": {
			const text = element.isDynamicField
				? resolveFieldValue(element.fieldKey, profile)
				: element.textContent;
			return (
				<div
					style={{
						...baseStyle,
						color: element.textColor || "#000000",
						fontSize: element.fontSize,
						fontFamily: element.fontName || "Inter, sans-serif",
						fontWeight: element.isBold ? 700 : 400,
						fontStyle: element.isItalic ? "italic" : "normal",
						textAlign: element.textAlignment,
						whiteSpace: "nowrap",
						lineHeight: 1.15,
					}}
				>
					{text}
				</div>
			);
		}

		case "image": {
			let src: string | null = element.imageData;
			if (element.isDynamicField) {
				const resolved = resolveFieldValue(element.fieldKey, profile);
				if (resolved) src = resolved;
			}
			const mask = element.mask ?? "none";
			const borderRadius =
				mask === "circle"
					? "50%"
					: element.cornerRadius
						? `${element.cornerRadius}px`
						: undefined;

			if (!src || src === "__has_image__") {
				return (
					<div
						style={{
							...baseStyle,
							background: element.fillColor || "#e5e7eb",
							border:
								element.strokeWidth > 0
									? `${element.strokeWidth}px solid ${element.strokeColor || "#d1d5db"}`
									: undefined,
							borderRadius,
						}}
					/>
				);
			}

			return (
				<img
					src={src}
					alt=""
					draggable={false}
					style={{
						...baseStyle,
						objectFit: "cover",
						borderRadius,
					}}
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).style.display = "none";
					}}
				/>
			);
		}

		case "qrCode": {
			const content = element.isDynamicField
				? resolveFieldValue(element.fieldKey, profile)
				: element.codeContent;
			if (!content) return null;
			return (
				<div
					style={{
						...baseStyle,
						background: "#ffffff",
						padding: 0,
					}}
				>
					<QRCode
						value={content}
						size={Math.min(element.width, element.height)}
						style={{
							width: "100%",
							height: "100%",
							display: "block",
						}}
						level="M"
					/>
				</div>
			);
		}

		case "barcode": {
			const content = element.isDynamicField
				? resolveFieldValue(element.fieldKey, profile)
				: element.codeContent;
			return (
				<div
					style={{
						...baseStyle,
						background: "#ffffff",
						border: `1px solid ${element.strokeColor || "#000000"}`,
						color: "#000000",
						fontFamily: "'Courier New', monospace",
						fontSize: 14,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						letterSpacing: "0.1em",
					}}
				>
					{content}
				</div>
			);
		}

		case "rectangle":
			return (
				<div
					style={{
						...baseStyle,
						background: element.fillColor,
						border:
							element.strokeWidth > 0
								? `${element.strokeWidth}px solid ${element.strokeColor}`
								: undefined,
						borderRadius: element.cornerRadius || 0,
					}}
				/>
			);

		case "circle":
			return (
				<div
					style={{
						...baseStyle,
						background: element.fillColor,
						border:
							element.strokeWidth > 0
								? `${element.strokeWidth}px solid ${element.strokeColor}`
								: undefined,
						borderRadius: "50%",
					}}
				/>
			);

		case "line":
			return (
				<div
					style={{
						...baseStyle,
						height: element.strokeWidth || 2,
						background: element.strokeColor || "#000000",
					}}
				/>
			);

		default:
			return null;
	}
}

// ─── Dynamic field resolution ──────────────────────────────────────────────
// Mirrors apps/agent-desktop/src/renderer/src/lib/dynamic-fields.ts so the
// preview shown to the citizen matches the print output 1:1.

function resolveFieldValue(key: string, profile: CardCanvasProfile): string {
	switch (key) {
		case "citizen.firstName":
			return profile.firstName ?? "";
		case "citizen.lastName":
			return profile.lastName ?? "";
		case "citizen.fullName":
			return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
		case "citizen.dateOfBirth":
			return profile.dateOfBirth ?? "";
		case "citizen.placeOfBirth":
			return profile.placeOfBirth ?? "";
		case "citizen.nationality":
			return profile.nationality ?? "";
		case "citizen.sex":
			return profile.sex ?? "";
		case "citizen.nip":
			return profile.nip ? `NIP : ${profile.nip}` : "";
		case "citizen.photo":
			return profile.photoUrl ?? "";
		case "card.number":
			return profile.cardNumber ?? "";
		case "card.issuedAt":
			return profile.cardIssuedAt ?? "";
		case "card.expiresAt":
			return profile.cardExpiresAt ?? "";
		case "card.qrCode":
			return profile.cardNumber
				? `https://consulat.ga/verify/${profile.cardNumber}`
				: "";
		case "consulate.name":
			return profile.consulateName ?? "";
		case "consulate.city":
			return profile.consulateCity ?? "";
		case "consulate.country":
			return profile.consulateCountry ?? "";
		default:
			return "";
	}
}
