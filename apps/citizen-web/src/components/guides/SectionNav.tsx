import { useTranslation } from "react-i18next";
import type { GuideSection } from "./guide.types";

export function SectionNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: GuideSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <nav className="hidden lg:block sticky top-24 space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
        {t("common.sections")}
      </h3>
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span
              className={`p-1.5 rounded-lg ${isActive ? section.iconBg : "bg-muted/50"}`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? section.color : ""}`}
              />
            </span>
            {section.title}
          </button>
        );
      })}
    </nav>
  );
}
