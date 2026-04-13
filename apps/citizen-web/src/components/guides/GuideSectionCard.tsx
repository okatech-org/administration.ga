import {
  ChevronRight,
  ExternalLink,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GuideSection } from "./guide.types";
import { GuideAccordionItem } from "./GuideAccordionItem";

export function GuideSectionCard({ section }: { section: GuideSection }) {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const Icon = section.icon;

  return (
    <div id={section.id} className="scroll-mt-24">
      <div className="overflow-hidden rounded-[10px] bg-card border border-border shadow-sm">
        {/* Image optionnelle */}
        {section.image && (
          <div className="relative h-48 md:h-56 overflow-hidden">
            <img
              src={section.image}
              alt={section.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}

        {/* Section Header */}
        <div
          className={`p-6 md:p-8 border-b border-border/40 ${section.image ? "-mt-16 relative z-10" : ""}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-[10px] ${section.iconBg} shrink-0`}
            >
              <Icon className={`w-7 h-7 ${section.color}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {section.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {section.intro}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Accordion Items */}
          <div className="space-y-3">
            {section.items.map((item, index) => (
              <GuideAccordionItem
                key={item.title}
                item={item}
                isOpen={openItems.has(index)}
                onToggle={() => toggleItem(index)}
                color={section.color}
              />
            ))}
          </div>

          {/* Tips */}
          {section.tips.length > 0 && (
            <div className="rounded-[10px] bg-warning/5 border border-warning/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-warning" />
                <h4 className="font-semibold text-foreground text-sm">
                  {t("guides.practicalTips")}
                </h4>
              </div>
              <ul className="space-y-2">
                {section.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <ChevronRight className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Useful Links */}
          {section.links && section.links.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t("guides.usefulLinks")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {section.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col p-3 rounded-[10px] border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.label}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {link.description}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 mt-2 group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
