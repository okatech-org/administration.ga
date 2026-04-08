import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useLocationContext } from "@/contexts/LocationContext";
import type { ErreurItem, NumeroUtile, SavoirVivreItem } from "./guide.types";
import { resolveLucideIcon } from "./resolveLucideIcon";

// ─── Savoir-vivre Grid ──────────────────────────────────────────────────────

interface SavoirVivreGridProps {
  items: Array<SavoirVivreItem | { iconName: string; title: string; description: string }>;
}

export function SavoirVivreGrid({ items }: SavoirVivreGridProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, idx) => {
        // Supporter les deux formats : LucideIcon directe ou iconName string
        const Icon = "icon" in item ? item.icon : resolveLucideIcon((item as any).iconName);
        return (
          <div
            key={idx}
            className="group rounded-[10px] bg-card border border-border p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-[10px] bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground">
                {item.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Erreurs courantes Grid ─────────────────────────────────────────────────

export function ErreursCourantesGrid({ items }: { items: ErreurItem[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-[10px] border border-border bg-warning/5 p-6 hover:-translate-y-0.5 transition-transform"
        >
          <div className="flex gap-5">
            <div className="p-2.5 rounded-[10px] bg-warning/10 h-fit shrink-0">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-lg mb-2">
                {item.erreur}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.conseil}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Numeros utiles — Grouped by local/gabon ────────────────────────────────

function getHref(item: NumeroUtile): string | undefined {
  if (item.type === "phone") return `tel:${item.number.replace(/\s/g, "")}`;
  if (item.type === "email") return `mailto:${item.number}`;
  if (item.type === "address")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.number)}`;
  return undefined;
}

function getIcon(type: NumeroUtile["type"]) {
  if (type === "email") return Mail;
  if (type === "address") return MapPin;
  return Phone;
}

function ContactRow({ item }: { item: NumeroUtile }) {
  const [copied, setCopied] = useState(false);
  const href = getHref(item);
  const Icon = getIcon(item.type);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(item.number).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [item.number],
  );

  const content = (
    <div className="group/row flex items-center gap-4 rounded-[10px] bg-card border border-border px-4 py-3.5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
      <div
        className={`shrink-0 w-10 h-10 rounded-lg ${item.color} flex items-center justify-center transition-transform duration-200 group-hover/row:scale-110`}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {item.label}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.number}
        </p>
        {item.description && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-2 rounded-lg hover:bg-muted/80 transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100"
        title="Copier"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-success" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {item.type === "address" && (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 hidden sm:block" />
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={item.type === "address" ? "_blank" : undefined}
        rel={item.type === "address" ? "noopener noreferrer" : undefined}
        className="block no-underline"
      >
        {content}
      </a>
    );
  }

  return content;
}

interface ContactGroupProps {
  flag: string;
  title: string;
  items: NumeroUtile[];
  accentColor: string;
  accentBg: string;
}

function ContactGroup({
  flag,
  title,
  items,
  accentColor,
  accentBg,
}: ContactGroupProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 px-1">
        <span className="text-2xl" role="img" aria-label={title}>
          {flag}
        </span>
        <h3 className={`text-base font-bold ${accentColor}`}>{title}</h3>
        <span
          className={`ml-auto text-[11px] font-medium px-2.5 py-0.5 rounded-full ${accentBg} ${accentColor}`}
        >
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, idx) => (
          <ContactRow key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

export function NumerosUtilesGrid({ items }: { items: NumeroUtile[] }) {
  const { countryName } = useLocationContext();

  const local = items.filter((n) => n.category === "local");
  const gabon = items.filter((n) => n.category === "gabon");

  return (
    <div className="grid md:grid-cols-2 gap-8 md:gap-10">
      <ContactGroup
        flag=""
        title={`Contacts ${countryName ? `en ${countryName}` : "locaux"}`}
        items={local}
        accentColor="text-primary"
        accentBg="bg-primary/10"
      />
      <ContactGroup
        flag=""
        title="Contacts au Gabon"
        items={gabon}
        accentColor="text-success"
        accentBg="bg-success/10"
      />
    </div>
  );
}
