import { CheckCircle2, ChevronDown } from "lucide-react";
import type { GuideItem } from "./guide.types";

export function GuideAccordionItem({
  item,
  isOpen,
  onToggle,
  color,
}: {
  item: GuideItem;
  isOpen: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <div className="border border-border rounded-[10px] overflow-hidden transition-all hover:border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className={`w-5 h-5 ${color} shrink-0`} />
          <span className="font-medium text-foreground">{item.title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="pl-8">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.detail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
