/**
 * DiplomaticProfileEditDialog — Édition du profil diplomatique par le SuperAdmin.
 *
 * Champs éditables :
 *   - Statut professionnel (en_poste, en_mission, en_congé, etc.)
 *   - Contact professionnel (téléphone, extension, email officiel)
 *   - Langues (code + niveau)
 *   - Bio
 *   - Accréditations (lettres de créance, carte diplomatique, passeport, exequatur)
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
	Award,
	Globe,
	Languages,
	Loader2,
	Mail,
	Phone,
	Plus,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutationQuery } from "@/integrations/convex/hooks";
import { cn } from "@/lib/utils";

// ─── Config ────────────────────────────────────────────────
const STATUS_OPTIONS = [
	{ value: "en_poste", label: "En poste" },
	{ value: "en_mission", label: "En mission" },
	{ value: "en_conge", label: "En congé" },
	{ value: "en_formation", label: "En formation" },
	{ value: "rapatrie", label: "Rapatrié" },
	{ value: "detache", label: "Détaché" },
];

const LANG_OPTIONS = [
	{ code: "fr", label: "Français" },
	{ code: "en", label: "Anglais" },
	{ code: "es", label: "Espagnol" },
	{ code: "pt", label: "Portugais" },
	{ code: "ar", label: "Arabe" },
	{ code: "zh", label: "Chinois" },
	{ code: "de", label: "Allemand" },
	{ code: "it", label: "Italien" },
	{ code: "ru", label: "Russe" },
	{ code: "sw", label: "Swahili" },
];

const LEVEL_OPTIONS = [
	{ value: "native", label: "Langue maternelle" },
	{ value: "fluent", label: "Courant" },
	{ value: "advanced", label: "Avancé (C1)" },
	{ value: "intermediate", label: "Intermédiaire (B1-B2)" },
	{ value: "basic", label: "Notions (A1-A2)" },
];

interface DiplomaticProfileEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	membershipId: Id<"memberships">;
	memberName: string;
	currentProfile: any;
}

export function DiplomaticProfileEditDialog({
	open,
	onOpenChange,
	membershipId,
	memberName,
	currentProfile,
}: DiplomaticProfileEditDialogProps) {
	const profile = currentProfile ?? {};

	// ─── Form state ──────────────────────────────────────
	const [status, setStatus] = useState(profile.status ?? "en_poste");
	const [officePhone, setOfficePhone] = useState(profile.officePhone ?? "");
	const [officeExtension, setOfficeExtension] = useState(profile.officeExtension ?? "");
	const [officialEmail, setOfficialEmail] = useState(profile.officialEmail ?? "");
	const [bio, setBio] = useState(profile.bio ?? "");
	const [languages, setLanguages] = useState<Array<{ code: string; level: string }>>(
		profile.languages ?? [],
	);

	// Credentials
	const [lettersDate, setLettersDate] = useState(
		profile.credentials?.lettersOfCredence?.presentedDate
			? new Date(profile.credentials.lettersOfCredence.presentedDate).toISOString().split("T")[0]
			: "",
	);
	const [diploCardNumber, setDiploCardNumber] = useState(profile.credentials?.diplomaticCard?.number ?? "");
	const [diploCardExpiry, setDiploCardExpiry] = useState(
		profile.credentials?.diplomaticCard?.expiresAt
			? new Date(profile.credentials.diplomaticCard.expiresAt).toISOString().split("T")[0]
			: "",
	);
	const [passportNumber, setPassportNumber] = useState(profile.credentials?.diplomaticPassport?.number ?? "");
	const [passportExpiry, setPassportExpiry] = useState(
		profile.credentials?.diplomaticPassport?.expiresAt
			? new Date(profile.credentials.diplomaticPassport.expiresAt).toISOString().split("T")[0]
			: "",
	);
	const [exequaturDate, setExequaturDate] = useState(
		profile.credentials?.exequatur?.grantedDate
			? new Date(profile.credentials.exequatur.grantedDate).toISOString().split("T")[0]
			: "",
	);

	// Reset on open
	useEffect(() => {
		if (open) {
			setStatus(profile.status ?? "en_poste");
			setOfficePhone(profile.officePhone ?? "");
			setOfficeExtension(profile.officeExtension ?? "");
			setOfficialEmail(profile.officialEmail ?? "");
			setBio(profile.bio ?? "");
			setLanguages(profile.languages ?? []);
		}
	}, [open, profile]);

	const { mutateAsync: updateProfile, isPending } = useConvexMutationQuery(
		api.functions.diplomaticProfile.adminUpdateDiplomaticProfile,
	);

	const handleSave = async () => {
		try {
			const credentials: any = {};
			if (lettersDate) credentials.lettersOfCredence = { presentedDate: new Date(lettersDate).getTime() };
			if (diploCardNumber || diploCardExpiry) {
				credentials.diplomaticCard = {
					...(diploCardNumber && { number: diploCardNumber }),
					...(diploCardExpiry && { expiresAt: new Date(diploCardExpiry).getTime() }),
				};
			}
			if (passportNumber || passportExpiry) {
				credentials.diplomaticPassport = {
					...(passportNumber && { number: passportNumber }),
					...(passportExpiry && { expiresAt: new Date(passportExpiry).getTime() }),
				};
			}
			if (exequaturDate) credentials.exequatur = { grantedDate: new Date(exequaturDate).getTime() };

			await updateProfile({
				membershipId,
				diplomaticProfile: {
					status,
					officePhone: officePhone || undefined,
					officeExtension: officeExtension || undefined,
					officialEmail: officialEmail || undefined,
					bio: bio || undefined,
					languages: languages.length > 0 ? languages : undefined,
					...(Object.keys(credentials).length > 0 && { credentials }),
				},
			});

			toast.success("Profil diplomatique mis à jour");
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur");
		}
	};

	const addLanguage = () => {
		setLanguages([...languages, { code: "fr", level: "intermediate" }]);
	};

	const removeLanguage = (index: number) => {
		setLanguages(languages.filter((_, i) => i !== index));
	};

	const updateLanguage = (index: number, field: "code" | "level", value: string) => {
		const updated = [...languages];
		updated[index] = { ...updated[index], [field]: value };
		setLanguages(updated);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Modifier le profil diplomatique</DialogTitle>
					<DialogDescription>{memberName}</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* ─── Statut ── */}
					<div className="space-y-2">
						<Label>Statut professionnel</Label>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* ─── Contact professionnel ── */}
					<div className="space-y-3">
						<h4 className="text-sm font-semibold flex items-center gap-2">
							<Phone className="h-4 w-4" /> Contact professionnel
						</h4>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-xs">Téléphone bureau</Label>
								<Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} placeholder="+34 91 XXX XXXX" />
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Extension</Label>
								<Input value={officeExtension} onChange={(e) => setOfficeExtension(e.target.value)} placeholder="101" />
							</div>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Email officiel</Label>
							<Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} placeholder="nom@diplomatie.ga" type="email" />
						</div>
					</div>

					{/* ─── Langues ── */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-semibold flex items-center gap-2">
								<Languages className="h-4 w-4" /> Langues
							</h4>
							<Button type="button" variant="outline" size="sm" onClick={addLanguage} className="h-7 text-xs gap-1">
								<Plus className="h-3 w-3" /> Ajouter
							</Button>
						</div>
						{languages.map((lang, i) => (
							<div key={i} className="flex items-center gap-2">
								<Select value={lang.code} onValueChange={(v) => updateLanguage(i, "code", v)}>
									<SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
									<SelectContent>
										{LANG_OPTIONS.map((l) => (
											<SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={lang.level} onValueChange={(v) => updateLanguage(i, "level", v)}>
									<SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
									<SelectContent>
										{LEVEL_OPTIONS.map((l) => (
											<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLanguage(i)}>
									<Trash2 className="h-3 w-3 text-destructive" />
								</Button>
							</div>
						))}
					</div>

					{/* ─── Bio ── */}
					<div className="space-y-2">
						<Label>Bio / Résumé</Label>
						<Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Parcours et responsabilités..." rows={3} />
					</div>

					{/* ─── Accréditations ── */}
					<div className="space-y-3">
						<h4 className="text-sm font-semibold flex items-center gap-2">
							<Award className="h-4 w-4" /> Accréditations
						</h4>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-xs">Lettres de créance — date de remise</Label>
								<Input type="date" value={lettersDate} onChange={(e) => setLettersDate(e.target.value)} />
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Exequatur — date d'octroi</Label>
								<Input type="date" value={exequaturDate} onChange={(e) => setExequaturDate(e.target.value)} />
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-xs">Carte diplomatique N°</Label>
								<Input value={diploCardNumber} onChange={(e) => setDiploCardNumber(e.target.value)} placeholder="DIP-2024-XXXX" />
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Carte — expiration</Label>
								<Input type="date" value={diploCardExpiry} onChange={(e) => setDiploCardExpiry(e.target.value)} />
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label className="text-xs">Passeport diplomatique N°</Label>
								<Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="CD XXXX" />
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Passeport — expiration</Label>
								<Input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} />
							</div>
						</div>
					</div>

					{/* ─── Actions ── */}
					<div className="flex justify-end gap-2 pt-2 border-t">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
							Annuler
						</Button>
						<Button onClick={handleSave} disabled={isPending} className="gap-2">
							{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
							Enregistrer
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
