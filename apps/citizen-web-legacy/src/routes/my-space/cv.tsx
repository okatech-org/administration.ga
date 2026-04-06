import { api } from "@convex/_generated/api";
import { LanguageLevel, SkillLevel } from "@convex/lib/constants";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import {
	Award,
	Brain,
	Briefcase,
	Download,
	Edit,
	FileText,
	Globe,
	GraduationCap,
	Languages,
	Loader2,
	Palette,
	Plus,
	Save,
	Sparkles,
	Target,
	Trash2,
	Upload,
	User,
	Wand2,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import type { DrawerState, DrawerView } from "@/components/cv/CVAIDrawer";
import { CVAIDrawer } from "@/components/cv/CVAIDrawer";
import { CVPreview } from "@/components/cv/CVPreview";
import type { CVData, CVTheme } from "@/components/cv/types";
import { PageHeader } from "@/components/my-space/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { captureEvent } from "@/lib/analytics";

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE
// ═══════════════════════════════════════════════════════════════════════════

export const Route = createFileRoute("/my-space/cv")({
	component: CVPage,
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const THEME_IDS: CVTheme[] = [
	"modern",
	"classic",
	"minimalist",
	"professional",
	"creative",
	"elegant",
];

const EMPTY_CV: CVData = {
	firstName: "",
	lastName: "",
	title: "",
	objective: "",
	email: "",
	phone: "",
	address: "",
	summary: "",
	experiences: [],
	education: [],
	skills: [],
	languages: [],
	hobbies: [],
	portfolioUrl: "",
	linkedinUrl: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function CVPage() {
	const { t } = useTranslation();

	// Data
	const cvData = useQuery(api.functions.cv.getMine);
	const upsertCV = useMutation(api.functions.cv.upsert);
	const addSkill = useMutation(api.functions.cv.addSkill);

	// AI actions
	const improveSummaryAI = useAction(api.functions.cvAI.improveSummary);
	const suggestSkillsAI = useAction(api.functions.cvAI.suggestSkills);
	const optimizeForJobAI = useAction(api.functions.cvAI.optimizeForJob);
	const generateCoverLetterAI = useAction(
		api.functions.cvAI.generateCoverLetter,
	);
	const atsScoreAI = useAction(api.functions.cvAI.atsScore);
	const translateCVAI = useAction(api.functions.cvAI.translateCV);
	const parseCVAI = useAction(api.functions.cvAI.parseCV);
	const generateUploadUrl = useMutation(
		api.functions.documents.generateUploadUrl,
	);
	const convex = useConvex();
	const getStorageUrl = async (args: { storageId: any }) => {
		return await convex.query(api.functions.documents.getUrl, args);
	};

	// UI State
	const [isEditing, setIsEditing] = useState(false);
	const [selectedTheme, setSelectedTheme] = useState<CVTheme>("modern");

	// AI Drawer state
	const [drawerState, setDrawerState] = useState<DrawerState>({
		view: null,
		phase: "input",
	});
	// Holds pending translation data before acceptance
	const pendingTranslation = useRef<CVData | null>(null);
	const pendingTranslateLang = useRef<string>("en");

	// Print ref
	const printRef = useRef<HTMLDivElement>(null);
	const handlePrint = useReactToPrint({ contentRef: printRef });

	// ─── Form state for editing ─────────────────────────────────────────────
	const [editForm, setEditForm] = useState<CVData>(EMPTY_CV);

	// Build display data
	const displayData: CVData = cvData
		? {
				firstName: cvData.firstName || "",
				lastName: cvData.lastName || "",
				title: cvData.title || "",
				objective: cvData.objective || "",
				email: cvData.email || "",
				phone: cvData.phone || "",
				address: cvData.address || "",
				summary: cvData.summary || "",
				experiences: cvData.experiences || [],
				education: cvData.education || [],
				skills: cvData.skills || [],
				languages: cvData.languages || [],
				hobbies: cvData.hobbies || [],
				portfolioUrl: cvData.portfolioUrl || "",
				linkedinUrl: cvData.linkedinUrl || "",
			}
		: EMPTY_CV;

	// Set theme from saved preference
	useState(() => {
		if (cvData?.preferredTheme) {
			setSelectedTheme(cvData.preferredTheme as CVTheme);
		}
	});

	// ─── Handlers ───────────────────────────────────────────────────────────

	const startEditing = () => {
		setEditForm({ ...displayData });
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setIsEditing(false);
	};

	const saveCV = async () => {
		try {
			await upsertCV({
				firstName: editForm.firstName,
				lastName: editForm.lastName,
				title: editForm.title,
				objective: editForm.objective,
				email: editForm.email,
				phone: editForm.phone,
				address: editForm.address,
				summary: editForm.summary,
				experiences: editForm.experiences.map((e) => ({
					title: e.title,
					company: e.company,
					location: e.location || "",
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description || "",
				})),
				education: editForm.education.map((e) => ({
					degree: e.degree,
					school: e.school,
					location: e.location || "",
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description || "",
				})),
				skills: editForm.skills.map((s) => ({
					name: s.name,
					level: s.level as (typeof SkillLevel)[keyof typeof SkillLevel],
				})),
				languages: editForm.languages.map((l) => ({
					name: l.name,
					level: l.level as (typeof LanguageLevel)[keyof typeof LanguageLevel],
				})),
				hobbies: editForm.hobbies,
				portfolioUrl: editForm.portfolioUrl,
				linkedinUrl: editForm.linkedinUrl,
				preferredTheme: selectedTheme,
			});
			toast.success(t("icv.saved"));
			setIsEditing(false);
		} catch (err) {
			toast.error(t("icv.saveError"));
			console.error(err);
		}
	};

	const handleImport = (data: Partial<CVData>) => {
		// Enter editing mode first so startEditing doesn't overwrite our data
		if (!isEditing) {
			setIsEditing(true);
		}
		// Merge imported data on top of current display data
		setEditForm((prev) => {
			const base = isEditing ? prev : displayData;
			return {
				...base,
				...data,
				experiences:
					data.experiences && data.experiences.length > 0
						? data.experiences
						: base.experiences,
				education:
					data.education && data.education.length > 0
						? data.education
						: base.education,
				skills:
					data.skills && data.skills.length > 0 ? data.skills : base.skills,
				languages:
					data.languages && data.languages.length > 0
						? data.languages
						: base.languages,
			};
		});
		toast.success(t("icv.imported"));
	};

	// ─── Helpers for CVContext ──────────────────────────────────────────────

	const buildCVContext = useCallback(() => {
		const d = isEditing ? editForm : displayData;
		const parts: string[] = [];
		parts.push(`Nom: ${d.firstName} ${d.lastName}`);
		if (d.title) parts.push(`Titre: ${d.title}`);
		if (d.summary) parts.push(`Résumé: ${d.summary}`);
		if (d.experiences.length) {
			parts.push("Expériences:");
			d.experiences.forEach((e) =>
				parts.push(
					`- ${e.title} chez ${e.company} (${e.startDate}-${e.current ? "Présent" : e.endDate}): ${e.description || ""}`,
				),
			);
		}
		if (d.education.length) {
			parts.push("Formation:");
			d.education.forEach((e) => parts.push(`- ${e.degree} — ${e.school}`));
		}
		if (d.skills.length) {
			parts.push(`Compétences: ${d.skills.map((s) => s.name).join(", ")}`);
		}
		if (d.languages.length) {
			parts.push(
				`Langues: ${d.languages.map((l) => `${l.name} (${l.level})`).join(", ")}`,
			);
		}
		return parts.join("\n");
	}, [isEditing, editForm, displayData]);

	// ─── AI Handlers (drawer-based) ─────────────────────────────────────────

	const openDrawer = (
		view: DrawerView,
		phase: DrawerState["phase"] = "input",
	) => {
		setDrawerState({ view, phase });
	};

	const closeDrawer = () => {
		setDrawerState({ view: null, phase: "input" });
	};

	const handleImproveSummary = async () => {
		const d = isEditing ? editForm : displayData;
		if (!d.summary) {
			toast.error(t("icv.ai.noSummary"));
			return;
		}
		setDrawerState({
			view: "improveSummary",
			phase: "loading",
			originalSummary: d.summary,
		});
		try {
			const result = await improveSummaryAI({
				summary: d.summary,
				cvContext: buildCVContext(),
			});
			setDrawerState((prev) => ({
				...prev,
				phase: "result",
				improvedSummary: result.improvedSummary,
			}));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const handleAcceptSummary = async (summary: string) => {
		if (isEditing) {
			setEditForm((prev) => ({ ...prev, summary }));
		} else {
			await upsertCV({ summary });
		}
		toast.success(t("icv.ai.summaryImproved"));
	};

	const handleSuggestSkills = async () => {
		setDrawerState({ view: "suggestSkills", phase: "loading" });
		try {
			const d = isEditing ? editForm : displayData;
			const result = await suggestSkillsAI({
				cvContext: buildCVContext(),
				existingSkills: d.skills.map((s) => s.name),
			});
			setDrawerState((prev) => ({
				...prev,
				phase: "result",
				suggestedSkills: result.suggestions,
			}));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const normalizeSkillLevel = (
		raw: string,
	): (typeof SkillLevel)[keyof typeof SkillLevel] => {
		const lower = raw.toLowerCase().trim();
		const mapping: Record<
			string,
			(typeof SkillLevel)[keyof typeof SkillLevel]
		> = {
			beginner: SkillLevel.Beginner,
			débutant: SkillLevel.Beginner,
			debutant: SkillLevel.Beginner,
			intermediate: SkillLevel.Intermediate,
			intermédiaire: SkillLevel.Intermediate,
			intermediaire: SkillLevel.Intermediate,
			advanced: SkillLevel.Advanced,
			avancé: SkillLevel.Advanced,
			avance: SkillLevel.Advanced,
			expert: SkillLevel.Expert,
		};
		return mapping[lower] || SkillLevel.Intermediate;
	};

	const handleAcceptSkill = async (name: string, level: string) => {
		const normalizedLevel = normalizeSkillLevel(level);
		if (isEditing) {
			setEditForm((prev) => ({
				...prev,
				skills: [...prev.skills, { name, level: normalizedLevel }],
			}));
		} else {
			await addSkill({
				name,
				level: normalizedLevel,
			});
		}
		// Remove accepted skill from suggestions
		setDrawerState((prev) => ({
			...prev,
			suggestedSkills:
				prev.suggestedSkills?.filter((s) => s.name !== name) || [],
		}));
		toast.success(t("icv.ai.skillAdded", "{{name}} ajouté", { name }));
	};

	const handleOptimizeForJob = async (jobDescription: string) => {
		setDrawerState((prev) => ({ ...prev, phase: "loading" }));
		try {
			const result = await optimizeForJobAI({
				cvContext: buildCVContext(),
				jobDescription,
			});
			setDrawerState((prev) => ({
				...prev,
				phase: "result",
				optimizeResult: JSON.stringify(result, null, 2),
			}));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const handleGenerateCoverLetter = async (data: {
		job: string;
		company: string;
		style: string;
		extra: string;
	}) => {
		setDrawerState((prev) => ({ ...prev, phase: "loading" }));
		try {
			const result = await generateCoverLetterAI({
				cvContext: buildCVContext(),
				jobTitle: data.job,
				companyName: data.company,
				additionalInfo: data.extra || undefined,
				style: data.style,
			});
			setDrawerState((prev) => ({
				...prev,
				phase: "result",
				coverLetterResult: result.coverLetter,
			}));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const handleATSScore = async () => {
		setDrawerState({ view: "atsScore", phase: "loading" });
		try {
			const result = await atsScoreAI({
				cvContext: buildCVContext(),
			});
			setDrawerState((prev) => ({
				...prev,
				phase: "result",
				atsResult: result,
			}));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const handleTranslateCV = async (lang: string) => {
		setDrawerState((prev) => ({ ...prev, phase: "loading" }));
		pendingTranslateLang.current = lang;
		const d = isEditing ? editForm : displayData;
		try {
			const result = await translateCVAI({
				firstName: d.firstName,
				lastName: d.lastName,
				title: d.title,
				objective: d.objective,
				summary: d.summary,
				experiences: d.experiences.map((e) => ({
					title: e.title,
					company: e.company,
					location: e.location,
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description,
				})),
				education: d.education.map((e) => ({
					degree: e.degree,
					school: e.school,
					location: e.location,
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description,
				})),
				skills: d.skills,
				languages: d.languages,
				hobbies: d.hobbies,
				targetLanguage: lang,
			});

			// Store translated data for acceptance
			const translated: CVData = {
				...d,
				title: result.title || d.title,
				objective: result.objective || d.objective,
				summary: result.summary || d.summary,
				experiences: d.experiences.map((e, i) => ({
					...e,
					title: result.experiences?.[i]?.title || e.title,
					description: result.experiences?.[i]?.description || e.description,
				})),
				skills: d.skills.map((s, i) => ({
					...s,
					name: result.skills?.[i]?.name || s.name,
				})),
				hobbies: result.hobbies || d.hobbies,
			};
			pendingTranslation.current = translated;

			setDrawerState((prev) => ({ ...prev, phase: "result" }));
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	// ─── Import CV via AI ──────────────────────────────────────────────────

	const handleRunImportCV = async (data: { text?: string; file?: File }) => {
		setDrawerState({ view: "importCV", phase: "loading" });
		try {
			let fileUrl: string | undefined;
			let fileMimeType: string | undefined;

			if (data.file) {
				// Upload file to Convex storage, then get URL
				const postUrl = await generateUploadUrl({});
				const result = await fetch(postUrl, {
					method: "POST",
					headers: { "Content-Type": data.file.type },
					body: data.file,
				});
				if (!result.ok) throw new Error("Upload failed");
				const { storageId } = await result.json();
				fileUrl = (await getStorageUrl({ storageId })) ?? undefined;
				fileMimeType = data.file.type;
			}

			const parsed = await parseCVAI({
				text: data.text,
				fileUrl,
				fileMimeType,
			});

			setDrawerState({
				view: "importCV",
				phase: "result",
				parsedCVData: parsed,
			});
		} catch (err) {
			toast.error(t("icv.ai.error"));
			console.error(err);
			closeDrawer();
		}
	};

	const handleAcceptImport = (data: Partial<CVData>) => {
		handleImport(data);
	};

	const handleAcceptTranslation = async () => {
		if (!pendingTranslation.current) return;
		const translated = pendingTranslation.current;
		if (isEditing) {
			setEditForm(translated);
		} else {
			await upsertCV({
				...translated,
				cvLanguage: pendingTranslateLang.current,
				experiences: translated.experiences.map((e) => ({
					title: e.title,
					company: e.company,
					location: e.location || "",
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description || "",
				})),
				education: translated.education.map((e) => ({
					degree: e.degree,
					school: e.school,
					location: e.location || "",
					startDate: e.startDate,
					endDate: e.endDate,
					current: e.current,
					description: e.description || "",
				})),
				skills: translated.skills.map((s) => ({
					name: s.name,
					level: s.level as (typeof SkillLevel)[keyof typeof SkillLevel],
				})),
				languages: translated.languages.map((l) => ({
					name: l.name,
					level: l.level as (typeof LanguageLevel)[keyof typeof LanguageLevel],
				})),
			});
		}
		pendingTranslation.current = null;
		toast.success(t("icv.ai.translated"));
	};

	// ─── Loading ────────────────────────────────────────────────────────────

	if (cvData === undefined) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 className="animate-spin text-muted-foreground" size={32} />
			</div>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// RENDER
	// ═══════════════════════════════════════════════════════════════════════════

	return (
		<div className="w-full space-y-5">
			<PageHeader
				title={t("icv.title")}
				subtitle={t("icv.subtitle")}
				icon={<FileText className="text-primary" size={24} />}
				actions={
					<div className="flex items-center gap-2 flex-wrap">
						<Button
							variant="outline"
							size="sm"
							onClick={() => openDrawer("importCV")}
						>
							<Upload size={15} className="mr-1.5" />
							<span className="hidden sm:inline">{t("icv.import.btn")}</span>
						</Button>
						{isEditing ? (
							<>
								<Button variant="outline" size="sm" onClick={cancelEditing}>
									<X size={15} className="mr-1.5" />
									<span className="hidden sm:inline">{t("common.cancel")}</span>
								</Button>
								<Button size="sm" onClick={saveCV}>
									<Save size={15} className="mr-1.5" />
									<span className="hidden sm:inline">{t("common.save")}</span>
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" size="sm" onClick={startEditing}>
									<Edit size={15} className="mr-1.5" />
									<span className="hidden sm:inline">{t("common.edit")}</span>
								</Button>
								<Button
									size="sm"
									onClick={() => {
										handlePrint();
										captureEvent("myspace_cv_generated", {
											template_used: selectedTheme,
										});
									}}
								>
									<Download size={15} className="mr-1.5" />
									<span className="hidden sm:inline">
										{t("icv.downloadPDF")}
									</span>
								</Button>
							</>
						)}
					</div>
				}
			/>

			{/* ─── Mobile AI Toolbar (visible on mobile only) ────────── */}
			<div className="lg:hidden">
				<div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
					<button
						type="button"
						onClick={handleImproveSummary}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<Wand2 size={14} />
						{t("icv.ai.improveSummary")}
					</button>
					<button
						type="button"
						onClick={() => {
							openDrawer("suggestSkills");
							handleSuggestSkills();
						}}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<Brain size={14} />
						{t("icv.ai.suggestSkills")}
					</button>
					<button
						type="button"
						onClick={() => openDrawer("optimizeForJob")}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<Target size={14} />
						{t("icv.ai.optimizeJob")}
					</button>
					<button
						type="button"
						onClick={() => openDrawer("coverLetter")}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-orange-500/10 text-orange-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<FileText size={14} />
						{t("icv.ai.coverLetter")}
					</button>
					<button
						type="button"
						onClick={() => {
							openDrawer("atsScore");
							handleATSScore();
						}}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<Zap size={14} />
						{t("icv.ai.atsScore")}
					</button>
					<button
						type="button"
						onClick={() => openDrawer("translateCV")}
						className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-sky-500/10 text-sky-600 text-xs font-medium whitespace-nowrap shrink-0"
					>
						<Globe size={14} />
						{t("icv.ai.translateCV")}
					</button>
				</div>
				{/* Mobile Theme Selector */}
				<div className="flex gap-2 overflow-x-auto pb-2 mt-2 -mx-1 px-1 scrollbar-hide">
					{THEME_IDS.map((id) => (
						<button
							key={id}
							type="button"
							onClick={() => setSelectedTheme(id)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
								selectedTheme === id
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground"
							}`}
						>
							<Palette size={12} />
							{t(`icv.themes.${id}`)}
						</button>
					))}
				</div>
			</div>

			{/* ─── Main Layout ─────────────────────────────────────────────── */}
			<div className="flex flex-col lg:flex-row gap-4">
				{/* ─── Left Panel: Themes + AI (desktop only) ──────────────── */}
				<div className="space-y-4 hidden lg:block max-w-70">
					{/* AI Features */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm flex items-center gap-2">
								<Sparkles size={15} className="text-amber-500" />
								{t("icv.ai.title")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1">
							<AIButton
								icon={<Wand2 size={14} />}
								label={t("icv.ai.improveProfile")}
								loading={
									drawerState.view === "improveSummary" &&
									drawerState.phase === "loading"
								}
								onClick={() => {
									openDrawer("improveSummary");
									handleImproveSummary();
								}}
								accent="text-violet-500"
							/>
							<AIButton
								icon={<Brain size={14} />}
								label={t("icv.ai.suggestSkills")}
								loading={
									drawerState.view === "suggestSkills" &&
									drawerState.phase === "loading"
								}
								onClick={() => {
									openDrawer("suggestSkills");
									handleSuggestSkills();
								}}
								accent="text-emerald-500"
							/>
							<AIButton
								icon={<Target size={14} />}
								label={t("icv.ai.optimizeJob")}
								onClick={() => openDrawer("optimizeForJob")}
								accent="text-blue-500"
							/>
							<AIButton
								icon={<FileText size={14} />}
								label={t("icv.ai.coverLetter")}
								onClick={() => openDrawer("coverLetter")}
								accent="text-orange-500"
							/>
							<AIButton
								icon={<Zap size={14} />}
								label={t("icv.ai.atsScore")}
								loading={
									drawerState.view === "atsScore" &&
									drawerState.phase === "loading"
								}
								onClick={() => {
									openDrawer("atsScore");
									handleATSScore();
								}}
								accent="text-amber-500"
							/>

							<Separator className="my-2" />

							<AIButton
								icon={<Globe size={14} />}
								label={t("icv.ai.translateCV")}
								onClick={() => openDrawer("translateCV")}
								accent="text-sky-500"
							/>
							<AIButton
								icon={<Upload size={14} />}
								label={t("icv.ai.importCV")}
								onClick={() => openDrawer("importCV")}
								accent="text-teal-500"
							/>
						</CardContent>
					</Card>
					{/* Theme Selector */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm flex items-center gap-2">
								<Palette size={15} />
								{t("icv.themes.title")}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{THEME_IDS.map((id) => (
								<button
									key={id}
									onClick={() => setSelectedTheme(id)}
									className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
										selectedTheme === id
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted/80"
									}`}
								>
									<span className="font-medium">{t(`icv.themes.${id}`)}</span>
									<span className="block text-xs opacity-70">
										{t(`icv.themes.${id}Desc`)}
									</span>
								</button>
							))}
						</CardContent>
					</Card>
				</div>

				{/* ─── Center: CV Preview or Edit Form ────────────────────── */}
				<div className="flex-1 w-full">
					{isEditing ? (
						<EditForm form={editForm} setForm={setEditForm} t={t} />
					) : (
						<div className="bg-muted/30  rounded-xl p-2 sm:p-4 flex items-start justify-center overflow-x-auto">
							<div
								ref={printRef}
								className="w-full min-w-[600px] max-w-[800px] shrink-0 origin-top shadow-xl rounded-lg overflow-hidden"
								style={{ aspectRatio: "210/297" }}
							>
								<CVPreview data={displayData} theme={selectedTheme} />
							</div>
						</div>
					)}
				</div>
			</div>

			{/* AI Drawer */}
			<CVAIDrawer
				state={drawerState}
				t={t}
				onClose={closeDrawer}
				onAcceptSummary={handleAcceptSummary}
				onAcceptSkill={handleAcceptSkill}
				onAcceptTranslation={handleAcceptTranslation}
				onAcceptImport={handleAcceptImport}
				onRunImproveSummary={handleImproveSummary}
				onRunSuggestSkills={handleSuggestSkills}
				onRunOptimizeForJob={handleOptimizeForJob}
				onRunGenerateCoverLetter={handleGenerateCoverLetter}
				onRunATSScore={handleATSScore}
				onRunTranslateCV={handleTranslateCV}
				onRunImportCV={handleRunImportCV}
			/>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AIButton({
	icon,
	label,
	loading,
	onClick,
	accent,
}: {
	icon: React.ReactNode;
	label: string;
	loading?: boolean;
	onClick: () => void;
	accent?: string;
}) {
	return (
		<button
			onClick={onClick}
			disabled={loading}
			className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium
        hover:bg-muted/80 transition-all disabled:opacity-50 text-left
        border border-transparent hover:border-border/50 group"
		>
			<div className={`shrink-0 ${accent || ""}`}>
				{loading ? <Loader2 className="animate-spin" size={14} /> : icon}
			</div>
			<span className="truncate flex-1">{label}</span>
			<Sparkles
				size={10}
				className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT FORM
// ═══════════════════════════════════════════════════════════════════════════

function EditForm({
	form,
	setForm,
	t,
}: {
	form: CVData;
	setForm: React.Dispatch<React.SetStateAction<CVData>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	t: any;
}) {
	const updateField = (field: keyof CVData, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="space-y-5">
			{/* Personal Info */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center gap-2">
						<User size={15} />
						{t("icv.form.personalInfo")}
					</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-xs font-medium mb-1 block">
							{t("common.firstName")}
						</label>
						<Input
							value={form.firstName}
							onChange={(e) => updateField("firstName", e.target.value)}
							className="h-9"
						/>
					</div>
					<div>
						<label className="text-xs font-medium mb-1 block">
							{t("common.lastName")}
						</label>
						<Input
							value={form.lastName}
							onChange={(e) => updateField("lastName", e.target.value)}
							className="h-9"
						/>
					</div>
					<div className="col-span-2">
						<label className="text-xs font-medium mb-1 block">
							{t("icv.form.title")}
						</label>
						<Input
							value={form.title}
							onChange={(e) => updateField("title", e.target.value)}
							placeholder={t("icv.form.titlePlaceholder")}
							className="h-9"
						/>
					</div>
					<div>
						<label className="text-xs font-medium mb-1 block">
							{t("icv.form.email")}
						</label>
						<Input
							value={form.email}
							onChange={(e) => updateField("email", e.target.value)}
							type="email"
							className="h-9"
						/>
					</div>
					<div>
						<label className="text-xs font-medium mb-1 block">
							{t("icv.form.phone")}
						</label>
						<Input
							value={form.phone}
							onChange={(e) => updateField("phone", e.target.value)}
							className="h-9"
						/>
					</div>
					<div className="col-span-2">
						<label className="text-xs font-medium mb-1 block">
							{t("icv.form.address")}
						</label>
						<Input
							value={form.address}
							onChange={(e) => updateField("address", e.target.value)}
							className="h-9"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Summary */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center gap-2">
						<FileText size={15} />
						{t("icv.form.summary")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Textarea
						value={form.summary}
						onChange={(e) => updateField("summary", e.target.value)}
						placeholder={t("icv.form.summaryPlaceholder")}
						className="h-24"
					/>
				</CardContent>
			</Card>

			{/* Experiences */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Briefcase size={15} />
							{t("icv.form.experiences")}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() =>
								setForm((prev) => ({
									...prev,
									experiences: [
										...prev.experiences,
										{
											title: "",
											company: "",
											location: "",
											startDate: "",
											endDate: "",
											current: false,
											description: "",
										},
									],
								}))
							}
						>
							<Plus size={13} className="mr-1" />
							{t("icv.form.add")}
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{form.experiences.map((exp, i) => (
						<div
							key={i}
							className="border rounded-lg p-3 space-y-2 relative group"
						>
							<button
								className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
								onClick={() =>
									setForm((prev) => ({
										...prev,
										experiences: prev.experiences.filter((_, j) => j !== i),
									}))
								}
							>
								<Trash2 size={14} />
							</button>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<Input
									placeholder={t("icv.form.jobTitle")}
									value={exp.title}
									onChange={(e) => {
										const updated = [...form.experiences];
										updated[i] = { ...updated[i], title: e.target.value };
										setForm((prev) => ({ ...prev, experiences: updated }));
									}}
									className="h-8 text-sm"
								/>
								<Input
									placeholder={t("icv.form.company")}
									value={exp.company}
									onChange={(e) => {
										const updated = [...form.experiences];
										updated[i] = { ...updated[i], company: e.target.value };
										setForm((prev) => ({ ...prev, experiences: updated }));
									}}
									className="h-8 text-sm"
								/>
								<Input
									placeholder={t("icv.form.location")}
									value={exp.location || ""}
									onChange={(e) => {
										const updated = [...form.experiences];
										updated[i] = { ...updated[i], location: e.target.value };
										setForm((prev) => ({ ...prev, experiences: updated }));
									}}
									className="h-8 text-sm"
								/>
								<div className="flex gap-2">
									<Input
										type="month"
										value={exp.startDate}
										onChange={(e) => {
											const updated = [...form.experiences];
											updated[i] = { ...updated[i], startDate: e.target.value };
											setForm((prev) => ({ ...prev, experiences: updated }));
										}}
										className="h-8 text-sm flex-1"
									/>
									<Input
										type="month"
										value={exp.endDate || ""}
										disabled={exp.current}
										onChange={(e) => {
											const updated = [...form.experiences];
											updated[i] = { ...updated[i], endDate: e.target.value };
											setForm((prev) => ({ ...prev, experiences: updated }));
										}}
										className="h-8 text-sm flex-1"
									/>
								</div>
							</div>
							<label className="flex items-center gap-2 text-xs">
								<input
									type="checkbox"
									checked={exp.current}
									onChange={(e) => {
										const updated = [...form.experiences];
										updated[i] = { ...updated[i], current: e.target.checked };
										setForm((prev) => ({ ...prev, experiences: updated }));
									}}
								/>
								{t("icv.form.currentPosition")}
							</label>
							<Textarea
								placeholder={t("icv.form.description")}
								value={exp.description || ""}
								onChange={(e) => {
									const updated = [...form.experiences];
									updated[i] = { ...updated[i], description: e.target.value };
									setForm((prev) => ({ ...prev, experiences: updated }));
								}}
								className="h-16 text-sm"
							/>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Education */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center justify-between">
						<span className="flex items-center gap-2">
							<GraduationCap size={15} />
							{t("icv.form.education")}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() =>
								setForm((prev) => ({
									...prev,
									education: [
										...prev.education,
										{
											degree: "",
											school: "",
											location: "",
											startDate: "",
											endDate: "",
											current: false,
											description: "",
										},
									],
								}))
							}
						>
							<Plus size={13} className="mr-1" />
							{t("icv.form.add")}
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{form.education.map((edu, i) => (
						<div
							key={i}
							className="border rounded-lg p-3 space-y-2 relative group"
						>
							<button
								className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
								onClick={() =>
									setForm((prev) => ({
										...prev,
										education: prev.education.filter((_, j) => j !== i),
									}))
								}
							>
								<Trash2 size={14} />
							</button>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<Input
									placeholder={t("icv.form.degree")}
									value={edu.degree}
									onChange={(e) => {
										const updated = [...form.education];
										updated[i] = { ...updated[i], degree: e.target.value };
										setForm((prev) => ({ ...prev, education: updated }));
									}}
									className="h-8 text-sm"
								/>
								<Input
									placeholder={t("icv.form.school")}
									value={edu.school}
									onChange={(e) => {
										const updated = [...form.education];
										updated[i] = { ...updated[i], school: e.target.value };
										setForm((prev) => ({ ...prev, education: updated }));
									}}
									className="h-8 text-sm"
								/>
								<Input
									placeholder={t("icv.form.location")}
									value={edu.location || ""}
									onChange={(e) => {
										const updated = [...form.education];
										updated[i] = { ...updated[i], location: e.target.value };
										setForm((prev) => ({ ...prev, education: updated }));
									}}
									className="h-8 text-sm"
								/>
								<div className="flex gap-2">
									<Input
										type="month"
										value={edu.startDate}
										onChange={(e) => {
											const updated = [...form.education];
											updated[i] = { ...updated[i], startDate: e.target.value };
											setForm((prev) => ({ ...prev, education: updated }));
										}}
										className="h-8 text-sm flex-1"
									/>
									<Input
										type="month"
										value={edu.endDate || ""}
										onChange={(e) => {
											const updated = [...form.education];
											updated[i] = { ...updated[i], endDate: e.target.value };
											setForm((prev) => ({ ...prev, education: updated }));
										}}
										className="h-8 text-sm flex-1"
									/>
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Skills */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Award size={15} />
							{t("icv.form.skills")}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() =>
								setForm((prev) => ({
									...prev,
									skills: [
										...prev.skills,
										{ name: "", level: SkillLevel.Intermediate },
									],
								}))
							}
						>
							<Plus size={13} className="mr-1" />
							{t("icv.form.add")}
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{form.skills.map((s, i) => (
							<div
								key={i}
								className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1"
							>
								<Input
									value={s.name}
									onChange={(e) => {
										const updated = [...form.skills];
										updated[i] = { ...updated[i], name: e.target.value };
										setForm((prev) => ({ ...prev, skills: updated }));
									}}
									className="h-6 w-28 text-xs border-0 bg-transparent p-0"
									placeholder={t("icv.form.skillPlaceholder")}
								/>
								<Select
									value={s.level}
									onValueChange={(v) => {
										const updated = [...form.skills];
										updated[i] = { ...updated[i], level: v };
										setForm((prev) => ({ ...prev, skills: updated }));
									}}
								>
									<SelectTrigger className="h-6 w-24 text-[10px] border-0 bg-transparent">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.values(SkillLevel).map((lvl) => (
											<SelectItem key={lvl} value={lvl} className="text-xs">
												{t(`icv.levels.skill.${lvl}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<button
									onClick={() =>
										setForm((prev) => ({
											...prev,
											skills: prev.skills.filter((_, j) => j !== i),
										}))
									}
									className="text-destructive/50 hover:text-destructive"
								>
									<X size={12} />
								</button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Languages */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center justify-between">
						<span className="flex items-center gap-2">
							<Languages size={15} />
							{t("icv.form.languages")}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={() =>
								setForm((prev) => ({
									...prev,
									languages: [
										...prev.languages,
										{ name: "", level: LanguageLevel.B1 },
									],
								}))
							}
						>
							<Plus size={13} className="mr-1" />
							{t("icv.form.add")}
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-2">
						{form.languages.map((l, i) => (
							<div
								key={i}
								className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1"
							>
								<Input
									value={l.name}
									onChange={(e) => {
										const updated = [...form.languages];
										updated[i] = { ...updated[i], name: e.target.value };
										setForm((prev) => ({ ...prev, languages: updated }));
									}}
									className="h-6 w-24 text-xs border-0 bg-transparent p-0"
									placeholder={t("icv.form.langPlaceholder")}
								/>
								<Select
									value={l.level}
									onValueChange={(v) => {
										const updated = [...form.languages];
										updated[i] = { ...updated[i], level: v };
										setForm((prev) => ({ ...prev, languages: updated }));
									}}
								>
									<SelectTrigger className="h-6 w-28 text-[10px] border-0 bg-transparent">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.values(LanguageLevel).map((lvl) => (
											<SelectItem key={lvl} value={lvl} className="text-xs">
												{t(`icv.levels.language.${lvl}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<button
									onClick={() =>
										setForm((prev) => ({
											...prev,
											languages: prev.languages.filter((_, j) => j !== i),
										}))
									}
									className="text-destructive/50 hover:text-destructive"
								>
									<X size={12} />
								</button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Links & Hobbies (compact) */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm flex items-center gap-2">
						<Globe size={15} />
						{t("icv.form.additional")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-medium mb-1 block">
								{t("icv.form.portfolioUrl")}
							</label>
							<Input
								value={form.portfolioUrl}
								onChange={(e) => updateField("portfolioUrl", e.target.value)}
								className="h-8 text-sm"
							/>
						</div>
						<div>
							<label className="text-xs font-medium mb-1 block">
								{t("icv.form.linkedinUrl")}
							</label>
							<Input
								value={form.linkedinUrl}
								onChange={(e) => updateField("linkedinUrl", e.target.value)}
								className="h-8 text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="text-xs font-medium mb-1 block">
							{t("icv.form.hobbies")}
						</label>
						<Input
							value={(form.hobbies || []).join(", ")}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									hobbies: e.target.value
										.split(",")
										.map((h) => h.trim())
										.filter(Boolean),
								}))
							}
							placeholder={t("icv.form.hobbiesPlaceholder")}
							className="h-8 text-sm"
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
