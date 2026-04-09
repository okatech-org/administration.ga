/**
 * Générateur PPTX — Projet de Coopération (Synthèse)
 *
 * 8 slides pour validation par la haute autorité.
 */

import type { ProjectData } from "./projectDocHelpers";
import { COLORS, FONTS, riskColor } from "./projectDocHelpers";

// JAMAIS réutiliser un objet shadow en pptxgenjs — utiliser une factory
const makeShadow = () => ({
  type: "outer" as const,
  blur: 4,
  offset: 2,
  angle: 135,
  color: "000000",
  opacity: 0.10,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addFooterBand(slide: any) {
  const yb = 5.35;
  const bh = 0.06;
  slide.addShape("rect", { x: 0, y: yb, w: 10, h: bh, fill: { color: COLORS.VERT_GABON } });
  slide.addShape("rect", { x: 0, y: yb + bh, w: 10, h: bh, fill: { color: COLORS.JAUNE_GABON } });
  slide.addShape("rect", { x: 0, y: yb + bh * 2, w: 10, h: bh, fill: { color: COLORS.BLEU_GABON } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSlideTitle(slide: any, title: string) {
  slide.addText(title, {
    x: 0.5, y: 0.2, w: 9, h: 0.6,
    fontSize: 24, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE,
  });
  slide.addShape("rect", { x: 0.5, y: 0.8, w: 2, h: 0.04, fill: { color: COLORS.VERT_GABON } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPageNumber(slide: any, num: number, total: number) {
  slide.addText(`${num} / ${total}`, {
    x: 9, y: 5.1, w: 0.8, h: 0.3,
    fontSize: 8, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY, align: "right",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addTable(slide: any, headers: string[], rows: string[][], opts: { y?: number; colW?: number[] } = {}) {
  const tableRows = [
    headers.map((h) => ({
      text: h,
      options: { bold: true, color: COLORS.BLANC, fill: { color: COLORS.VERT_GABON }, fontSize: 9, fontFace: FONTS.BODY },
    })),
    ...rows.map((row, ri) =>
      row.map((cell) => ({
        text: cell || "",
        options: { fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, fill: { color: ri % 2 ? COLORS.GRIS_CLAIR : COLORS.BLANC } },
      })),
    ),
  ];
  slide.addTable(tableRows, {
    x: 0.5, y: opts.y ?? 1.0, w: 9,
    colW: opts.colW,
    border: { type: "solid", pt: 0.5, color: COLORS.BORDER_GRAY },
    margin: [4, 6, 4, 6],
    autoPage: false,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function generateProjectPptx(data: ProjectData): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Consulat.ga — Module Affaires Diplomatiques";
  pres.title = data.title || "Projet de Coopération";
  const TOTAL = 8;

  // ═══ SLIDE 1 — Couverture ═══
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.BLANC };

    // Bandeau vert en haut
    slide.addShape("rect", { x: 0, y: 0, w: 10, h: 0.8, fill: { color: COLORS.VERT_GABON } });
    slide.addText("RÉPUBLIQUE GABONAISE", {
      x: 0.5, y: 0.15, w: 9, h: 0.5,
      fontSize: 14, bold: true, color: COLORS.BLANC, fontFace: FONTS.TITLE, align: "center",
    });

    slide.addText("PROJET DE COOPÉRATION", {
      x: 0.5, y: 1.5, w: 9, h: 0.8,
      fontSize: 36, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE, align: "center",
    });

    slide.addText(data.title, {
      x: 0.8, y: 2.5, w: 8.4, h: 0.6,
      fontSize: 18, italic: true, color: COLORS.BLEU_MARINE, fontFace: FONTS.BODY, align: "center",
    });

    slide.addText(`${data.partnerName} — ${data.partnerCountry}`, {
      x: 1, y: 3.2, w: 8, h: 0.4,
      fontSize: 14, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, align: "center",
    });

    // Métriques clés (3 cards)
    const metrics = [
      { label: "Budget", value: data.budget, color: COLORS.VERT_GABON },
      { label: "Durée", value: data.duration, color: COLORS.BLEU_MARINE },
      { label: "Emplois", value: data.estimatedJobs, color: COLORS.BLEU_GABON },
    ];
    metrics.forEach((m, i) => {
      const mx = 0.8 + i * 3;
      slide.addShape("rect", { x: mx, y: 3.9, w: 2.6, h: 1.0, fill: { color: COLORS.BLANC }, shadow: makeShadow(), line: { color: COLORS.BORDER_GRAY, width: 0.5 } });
      slide.addText(m.value, { x: mx, y: 3.95, w: 2.6, h: 0.55, fontSize: 14, bold: true, color: m.color, fontFace: FONTS.TITLE, align: "center" });
      slide.addText(m.label, { x: mx, y: 4.45, w: 2.6, h: 0.35, fontSize: 9, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY, align: "center" });
    });

    slide.addText(data.dateStr, {
      x: 0.5, y: 5.1, w: 9, h: 0.3,
      fontSize: 10, color: COLORS.VERT_GABON, fontFace: FONTS.BODY, align: "center",
    });

    addFooterBand(slide);
  }

  // ═══ SLIDE 2 — Résumé + KPIs ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Résumé du Projet");

    // Description
    slide.addText(data.description.substring(0, 300) + (data.description.length > 300 ? "..." : ""), {
      x: 0.5, y: 1.0, w: 9, h: 1.0,
      fontSize: 10, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY,
    });

    // KPI cards en grille 2x2
    if (data.kpis.length > 0) {
      data.kpis.slice(0, 4).forEach((kpi, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = 0.5 + col * 4.7;
        const cy = 2.3 + row * 1.5;

        slide.addShape("rect", { x: cx, y: cy, w: 4.3, h: 1.2, fill: { color: kpi.color }, shadow: makeShadow() });
        slide.addText(kpi.value, {
          x: cx, y: cy + 0.1, w: 4.3, h: 0.65,
          fontSize: 22, bold: true, color: COLORS.BLANC, fontFace: FONTS.TITLE, align: "center",
        });
        slide.addText(kpi.label, {
          x: cx, y: cy + 0.75, w: 4.3, h: 0.35,
          fontSize: 10, color: COLORS.BLANC, fontFace: FONTS.BODY, align: "center",
        });
      });
    }

    addFooterBand(slide);
    addPageNumber(slide, 2, TOTAL);
  }

  // ═══ SLIDE 3 — Cadre Logique ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Cadre Logique");

    slide.addText(`Objectif général : ${data.generalObjective}`, {
      x: 0.5, y: 1.0, w: 9, h: 0.45,
      fontSize: 10, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.BODY,
    });
    slide.addText(`Objectif spécifique : ${data.specificObjective}`, {
      x: 0.5, y: 1.45, w: 9, h: 0.45,
      fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY,
    });

    if (data.results.length > 0) {
      addTable(slide,
        ["Résultat", "Indicateur clé", "Cible"],
        data.results.slice(0, 4).map((r) => [
          `${r.id}: ${r.title.substring(0, 45)}`,
          r.indicators[0]?.indicator || "—",
          r.indicators[0]?.targetValue || "—",
        ]),
        { y: 2.1, colW: [3.5, 3.5, 2] },
      );
    }

    addFooterBand(slide);
    addPageNumber(slide, 3, TOTAL);
  }

  // ═══ SLIDE 4 — Budget ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Budget Détaillé");

    if (data.budgetItems.length > 0) {
      addTable(slide,
        ["Poste", "Montant", "%"],
        data.budgetItems.slice(0, 7).map((item) => [item.category, item.amount, `${item.percentage}%`]),
        { y: 1.0, colW: [4, 3, 2] },
      );
    }

    slide.addText(`TOTAL : ${data.budgetTotal} ${data.budgetCurrency}`, {
      x: 0.5, y: 4.6, w: 9, h: 0.4,
      fontSize: 16, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE, align: "right",
    });

    addFooterBand(slide);
    addPageNumber(slide, 4, TOTAL);
  }

  // ═══ SLIDE 5 — Calendrier ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Calendrier de Mise en Œuvre");

    if (data.phases.length > 0) {
      data.phases.slice(0, 5).forEach((phase, idx) => {
        const y = 1.2 + idx * 0.85;

        // Cercle numéroté
        slide.addShape("rect", { x: 0.5, y, w: 0.6, h: 0.6, fill: { color: COLORS.VERT_GABON } });
        slide.addText(String(idx + 1), {
          x: 0.5, y, w: 0.6, h: 0.6,
          fontSize: 14, bold: true, color: COLORS.BLANC, align: "center", valign: "middle",
        });

        // Détails
        slide.addText(phase.phase, {
          x: 1.3, y, w: 5, h: 0.3,
          fontSize: 11, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.BODY,
        });
        slide.addText(`${phase.startDate} → ${phase.endDate}`, {
          x: 1.3, y: y + 0.3, w: 5, h: 0.25,
          fontSize: 9, italic: true, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY,
        });

        // Livrables
        const livrablesText = phase.deliverables.slice(0, 2).join(", ");
        if (livrablesText) {
          slide.addText(livrablesText, {
            x: 6.5, y, w: 3.2, h: 0.55,
            fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY,
          });
        }
      });
    }

    slide.addText(`Durée totale : ${data.totalDuration}`, {
      x: 0.5, y: 5.0, w: 9, h: 0.3,
      fontSize: 12, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE, align: "right",
    });

    addFooterBand(slide);
    addPageNumber(slide, 5, TOTAL);
  }

  // ═══ SLIDE 6 — Risques ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Analyse des Risques");

    if (data.risks.length > 0) {
      data.risks.slice(0, 4).forEach((risk, idx) => {
        const y = 1.2 + idx * 1.0;
        const rc = riskColor(risk.probability);

        // Card avec bordure colorée
        slide.addShape("rect", { x: 0.5, y, w: 9, h: 0.85, fill: { color: COLORS.GRIS_CLAIR }, line: { color: rc, width: 2.5 } });
        slide.addText(`${risk.category.toUpperCase()} — ${risk.risk}`, {
          x: 0.7, y: y + 0.05, w: 8.6, h: 0.35,
          fontSize: 10, bold: true, color: rc, fontFace: FONTS.BODY,
        });
        slide.addText(`Atténuation : ${risk.mitigation}`, {
          x: 0.7, y: y + 0.4, w: 8.6, h: 0.4,
          fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY,
        });
      });
    }

    addFooterBand(slide);
    addPageNumber(slide, 6, TOTAL);
  }

  // ═══ SLIDE 7 — Impact ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Impact Attendu");

    const impacts = [
      { title: "Économique", items: data.economicImpact, color: COLORS.VERT_GABON },
      { title: "Social", items: data.socialImpact, color: COLORS.BLEU_GABON },
      { title: "Environnemental", items: data.environmentalImpact, color: COLORS.VERT_FAIBLE },
    ];

    impacts.forEach((imp, i) => {
      const cx = 0.3 + i * 3.2;
      // Card
      slide.addShape("rect", { x: cx, y: 1.0, w: 3.0, h: 3.5, fill: { color: COLORS.BLANC }, shadow: makeShadow() });
      // Header coloré
      slide.addShape("rect", { x: cx, y: 1.0, w: 3.0, h: 0.45, fill: { color: imp.color } });
      slide.addText(imp.title, {
        x: cx, y: 1.0, w: 3.0, h: 0.45,
        fontSize: 12, bold: true, color: COLORS.BLANC, fontFace: FONTS.BODY, align: "center", valign: "middle",
      });
      // Contenu (bullets)
      if (imp.items.length > 0) {
        slide.addText(
          imp.items.slice(0, 4).map((item) => ({ text: item, options: { bullet: true, breakLine: true } })),
          { x: cx + 0.15, y: 1.55, w: 2.7, h: 2.8, fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY },
        );
      }
    });

    // Métriques
    if (data.estimatedJobsDetail !== "À évaluer" || data.estimatedBeneficiaries !== "À évaluer") {
      slide.addText(
        [
          data.estimatedJobsDetail !== "À évaluer" ? `Emplois : ${data.estimatedJobsDetail}` : null,
          data.estimatedBeneficiaries !== "À évaluer" ? `Bénéficiaires : ${data.estimatedBeneficiaries}` : null,
        ].filter(Boolean).join("  ·  "),
        { x: 0.5, y: 4.7, w: 9, h: 0.4, fontSize: 12, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE, align: "center" },
      );
    }

    addFooterBand(slide);
    addPageNumber(slide, 7, TOTAL);
  }

  // ═══ SLIDE 8 — Prochaines Étapes ═══
  {
    const slide = pres.addSlide();
    addSlideTitle(slide, "Prochaines Étapes et Décision");

    // Résumé en info box
    slide.addShape("rect", { x: 0.5, y: 1.1, w: 9, h: 1.8, fill: { color: COLORS.GRIS_CLAIR }, line: { color: COLORS.VERT_GABON, width: 1.5 } });
    slide.addText([
      { text: "Projet : ", options: { bold: true, fontSize: 11, color: COLORS.VERT_FONCE } },
      { text: data.title, options: { fontSize: 11, color: COLORS.GRIS_FONCE } },
      { text: "\nPartenaire : ", options: { bold: true, fontSize: 11, color: COLORS.VERT_FONCE } },
      { text: data.partnerName, options: { fontSize: 11, color: COLORS.GRIS_FONCE } },
      { text: "\nBudget : ", options: { bold: true, fontSize: 11, color: COLORS.VERT_FONCE } },
      { text: `${data.budget} ${data.currency}`, options: { fontSize: 11, color: COLORS.GRIS_FONCE } },
      { text: "\nDurée : ", options: { bold: true, fontSize: 11, color: COLORS.VERT_FONCE } },
      { text: data.duration, options: { fontSize: 11, color: COLORS.GRIS_FONCE } },
    ], { x: 0.7, y: 1.2, w: 8.6, h: 1.6, fontFace: FONTS.BODY });

    // Décision
    slide.addShape("rect", { x: 1.5, y: 3.3, w: 7, h: 1.0, fill: { color: COLORS.VERT_GABON }, shadow: makeShadow() });
    slide.addText("DÉCISION REQUISE", {
      x: 1.5, y: 3.35, w: 7, h: 0.45,
      fontSize: 18, bold: true, color: COLORS.BLANC, fontFace: FONTS.TITLE, align: "center",
    });
    slide.addText("Approbation du projet pour passage en phase d'exécution", {
      x: 1.5, y: 3.8, w: 7, h: 0.4,
      fontSize: 11, color: COLORS.BLANC, fontFace: FONTS.BODY, align: "center",
    });

    slide.addText("Document généré par consulat.ga — Module Affaires Diplomatiques", {
      x: 0.5, y: 5.0, w: 9, h: 0.3,
      fontSize: 7, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY, align: "center",
    });

    addFooterBand(slide);
    addPageNumber(slide, 8, TOTAL);
  }

  return await pres.write({ outputType: "nodebuffer" }) as Buffer;
}
