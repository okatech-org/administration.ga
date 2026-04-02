import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface ImageCropDialogProps {
	open: boolean;
	imageFile: File | null;
	onClose: () => void;
	onCropComplete: (croppedFile: File) => void;
}

export function ImageCropDialog({
	open,
	imageFile,
	onClose,
	onCropComplete,
}: ImageCropDialogProps) {
	const { t } = useTranslation();
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [rotation, setRotation] = useState(0);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	// Create object URL only when file changes
	const imageUrl = imageFile ? URL.createObjectURL(imageFile) : "";

	const handleCropComplete = useCallback(
		(_croppedArea: Area, croppedAreaPixels: Area) => {
			setCroppedAreaPixels(croppedAreaPixels);
		},
		[],
	);

	const processCrop = async () => {
		if (!imageFile || !imageUrl || !croppedAreaPixels) return;

		try {
			setIsProcessing(true);
			const croppedImageBlob = await getCroppedImg(
				imageUrl,
				croppedAreaPixels,
				rotation,
			);

			// Create a new File from the Blob
			const croppedFile = new File([croppedImageBlob], imageFile.name, {
				type: "image/jpeg",
				lastModified: Date.now(),
			});

			onCropComplete(croppedFile);
			onClose();
		} catch (e) {
			console.error("Error cropping image:", e);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="sm:max-w-[600px] p-4 gap-3">
				<DialogHeader className="pb-0">
					<DialogTitle className="text-base">
						{t("register.documents.cropPhoto", "Recadrer la photo")}
					</DialogTitle>
				</DialogHeader>

				{/* Guide: photo + tips side by side, compact */}
				<div className="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 p-2">
					<img
						src="/images/id-photo-guide.png"
						alt={t(
							"register.documents.photoGuideAlt",
							"Exemple de photo d'identité",
						)}
						className="size-18 rounded object-cover shrink-0"
					/>
					<ul className="text-[11px] text-muted-foreground space-y-0.5">
						<li>
							 {t("register.documents.photoTip1", "Visage centré et dégagé")}
						</li>
						<li> {t("register.documents.photoTip2", "Fond uni et clair")}</li>
						<li>
							{" "}
							{t(
								"register.documents.photoTip3",
								"Expression neutre, bouche fermée",
							)}
						</li>
					</ul>
				</div>

				{/* Crop zone */}
				<div className="relative h-[220px] sm:h-[280px] w-full bg-black/5 rounded-md overflow-hidden">
					{imageUrl && (
						<Cropper
							image={imageUrl}
							crop={crop}
							zoom={zoom}
							rotation={rotation}
							aspect={1}
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onRotationChange={setRotation}
							onCropComplete={handleCropComplete}
						/>
					)}
				</div>

				{/* Controls */}
				<div className="flex flex-col gap-4 py-1">
					<div className="flex items-center gap-4">
						<span className="text-sm font-medium w-16 shrink-0">Zoom</span>
						<Slider
							value={[zoom]}
							min={1}
							max={3}
							step={0.1}
							onValueChange={(value) => setZoom(value[0])}
							className="flex-1"
						/>
					</div>
					<div className="flex items-center gap-4">
						<span className="text-sm font-medium w-16 shrink-0">
							{t("register.documents.rotation", "Rotation")}
						</span>
						<Slider
							value={[rotation]}
							min={-180}
							max={180}
							step={1}
							onValueChange={(value) => setRotation(value[0])}
							className="flex-1"
						/>
						<span className="text-xs text-muted-foreground w-10 text-right shrink-0">
							{rotation}°
						</span>
					</div>
				</div>

				{/* Buttons: always side by side */}
				<div className="flex gap-2 pt-1">
					<Button
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isProcessing}
						className="flex-shrink-0"
					>
						{t("common.cancel", "Annuler")}
					</Button>
					<Button
						onClick={processCrop}
						disabled={isProcessing}
						className="flex-1"
					>
						{isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t("common.confirm", "Confirmer")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Utility to extract the cropped + rotated portion
async function getCroppedImg(
	imageSrc: string,
	pixelCrop: Area,
	rotation = 0,
): Promise<Blob> {
	const image = await createImage(imageSrc);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		throw new Error("No 2d context");
	}

	const radians = (rotation * Math.PI) / 180;
	const sin = Math.abs(Math.sin(radians));
	const cos = Math.abs(Math.cos(radians));

	// Compute bounding box of the rotated source image
	const rotatedWidth = image.width * cos + image.height * sin;
	const rotatedHeight = image.width * sin + image.height * cos;

	// Step 1: draw the full rotated image onto a temp canvas
	const rotCanvas = document.createElement("canvas");
	rotCanvas.width = rotatedWidth;
	rotCanvas.height = rotatedHeight;
	const rotCtx = rotCanvas.getContext("2d");
	if (!rotCtx) {
		throw new Error("No 2d context for rotation canvas");
	}

	rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
	rotCtx.rotate(radians);
	rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

	// Step 2: crop from the rotated canvas
	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	ctx.drawImage(
		rotCanvas,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height,
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(file: Blob | null) => {
				if (file) resolve(file);
				else reject(new Error("Canvas is empty"));
			},
			"image/jpeg",
			0.95,
		);
	});
}

function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", (error) => reject(error));
		image.src = url;
	});
}
