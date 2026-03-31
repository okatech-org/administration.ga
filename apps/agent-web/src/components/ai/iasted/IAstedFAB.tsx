/**
 * IAstedFAB — Bouton flottant d'accès à iAsted.
 * Affiché en bas à droite quand la fenêtre est fermée.
 */

import { Bot } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

interface IAstedFABProps {
	isOpen: boolean;
	onClick: () => void;
	unreadCount?: number;
}

export function IAstedFAB({ isOpen, onClick, unreadCount = 0 }: IAstedFABProps) {
	return (
		<AnimatePresence>
			{!isOpen && (
				<motion.div
					initial={{ scale: 0, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0, opacity: 0 }}
					transition={{ type: "spring", damping: 20, stiffness: 300 }}
					className="fixed bottom-6 right-6 z-50"
				>
					<Button
						size="lg"
						className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-emerald-600 hover:bg-emerald-700 relative"
						onClick={onClick}
						aria-label="Ouvrir iAsted"
					>
						<Bot className="h-6 w-6" />
						{unreadCount > 0 && (
							<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
