import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function scrollToTop() {
	window.scrollTo({ top: 0, behavior: "smooth" });
	const mainArea = document.getElementById("main-scrollable-area");
	if (mainArea) {
		mainArea.scrollTo({ top: 0, behavior: "smooth" });
	}
}
