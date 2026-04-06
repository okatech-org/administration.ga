import type { CVData, CVTheme } from "./types";
import { CVThemeModern } from "./themes/CVThemeModern";
import { CVThemeClassic } from "./themes/CVThemeClassic";
import { CVThemeMinimalist } from "./themes/CVThemeMinimalist";
import { CVThemeProfessional } from "./themes/CVThemeProfessional";
import { CVThemeCreative } from "./themes/CVThemeCreative";
import { CVThemeElegant } from "./themes/CVThemeElegant";

interface CVPreviewProps {
  data: CVData;
  theme: CVTheme;
}

const THEME_COMPONENTS: Record<
  CVTheme,
  React.ComponentType<{ data: CVData }>
> = {
  modern: CVThemeModern,
  classic: CVThemeClassic,
  minimalist: CVThemeMinimalist,
  professional: CVThemeProfessional,
  creative: CVThemeCreative,
  elegant: CVThemeElegant,
};

export function CVPreview({ data, theme }: CVPreviewProps) {
  const ThemeComponent = THEME_COMPONENTS[theme] || CVThemeModern;
  return <ThemeComponent data={data} />;
}
