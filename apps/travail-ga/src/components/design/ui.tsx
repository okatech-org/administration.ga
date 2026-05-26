/**
 * UI primitives TRAVAIL.GA — design system éditorial.
 * Source : design Claude `components.jsx`. Adapté en TSX + Next.js.
 */
"use client";

import {
  type CSSProperties,
  type ReactNode,
  useState,
} from "react";
import { Icons } from "./icons";

// ─── Button ──────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<
  ButtonVariant,
  { bg: string; fg: string; bd: string; hoverBg: string }
> = {
  primary: {
    bg: "var(--brand-blue)",
    fg: "var(--fg-on-brand)",
    bd: "var(--brand-blue)",
    hoverBg: "var(--brand-blue-700)",
  },
  secondary: {
    bg: "transparent",
    fg: "var(--fg)",
    bd: "var(--border-strong)",
    hoverBg: "var(--bg-elev-2)",
  },
  ghost: {
    bg: "transparent",
    fg: "var(--fg)",
    bd: "transparent",
    hoverBg: "var(--bg-elev-2)",
  },
  accent: {
    bg: "var(--brand-ember)",
    fg: "#fff",
    bd: "var(--brand-ember)",
    hoverBg: "var(--brand-ember-600)",
  },
  danger: {
    bg: "transparent",
    fg: "var(--color-danger)",
    bd: "var(--color-danger)",
    hoverBg: "rgba(194,67,67,.08)",
  },
};

const BUTTON_SIZES: Record<
  ButtonSize,
  { padX: number; fz: number; h: number }
> = {
  sm: { padX: 12, fz: 13, h: 32 },
  md: { padX: 16, fz: 14, h: 38 },
  lg: { padX: 20, fz: 15, h: 46 },
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  iconRight,
  onClick,
  type = "button",
  style,
  disabled,
  className,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
  icon?: ReactNode;
  iconRight?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  disabled?: boolean;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const v = BUTTON_VARIANTS[variant];
  const sz = BUTTON_SIZES[size];
  const [h, setH] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: sz.h,
        padding: `0 ${sz.padX}px`,
        fontSize: sz.fz,
        fontWeight: 550,
        background: h && !disabled ? v.hoverBg : v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 10,
        transition:
          "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "-0.005em",
        boxShadow: variant === "primary" ? "var(--shadow-1)" : "none",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── Badge / chip ────────────────────────────────────────────────────────
export type BadgeTone =
  | "neutral"
  | "blue"
  | "ember"
  | "emerald"
  | "terra"
  | "gold"
  | "danger"
  | "outline";

const BADGE_TONES: Record<
  BadgeTone,
  { bg: string; fg: string; bd: string }
> = {
  neutral: {
    bg: "var(--bg-elev-2)",
    fg: "var(--fg-muted)",
    bd: "var(--border-faint)",
  },
  blue: { bg: "var(--brand-blue-50)", fg: "var(--brand-blue)", bd: "transparent" },
  ember: {
    bg: "var(--brand-ember-50)",
    fg: "var(--brand-ember)",
    bd: "transparent",
  },
  emerald: {
    bg: "var(--brand-emerald-50)",
    fg: "var(--brand-emerald)",
    bd: "transparent",
  },
  terra: {
    bg: "var(--brand-terra-50)",
    fg: "var(--brand-terra)",
    bd: "transparent",
  },
  gold: {
    bg: "rgba(201,162,75,0.14)",
    fg: "var(--brand-gold)",
    bd: "transparent",
  },
  danger: {
    bg: "rgba(194,67,67,0.10)",
    fg: "var(--color-danger)",
    bd: "transparent",
  },
  outline: {
    bg: "transparent",
    fg: "var(--fg-muted)",
    bd: "var(--border-strong)",
  },
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  size = "sm",
  style,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md";
  style?: CSSProperties;
}) {
  const tones = BADGE_TONES[tone];
  const sz = size === "sm" ? { fz: 11.5, py: 3, px: 8 } : { fz: 12.5, py: 4, px: 10 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `${sz.py}px ${sz.px}px`,
        background: tones.bg,
        color: tones.fg,
        border: `1px solid ${tones.bd}`,
        borderRadius: 999,
        fontSize: sz.fz,
        fontWeight: 550,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

// ─── Avatar (entreprise / particulier) ───────────────────────────────────
export function Avatar({
  logo,
  size = 40,
  verified,
  style,
}: {
  logo: { txt: string; bg: string; fg: string };
  size?: number;
  verified?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", flexShrink: 0, ...style }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size <= 32 ? 8 : 10,
          background: logo.bg,
          color: logo.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: size * 0.42,
          fontWeight: 900,
          letterSpacing: "-0.02em",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {logo.txt}
      </div>
      {verified && (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "var(--brand-blue)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--bg-elev-1)",
          }}
        >
          <Icons.Check size={8} style={{ strokeWidth: 3 }} />
        </div>
      )}
    </div>
  );
}

// ─── Emitter pill ────────────────────────────────────────────────────────
export type EmetteurType = "ENTREPRISE" | "ADMINISTRATION" | "PARTICULIER";

export function EmetteurPill({
  type,
  size = "sm",
}: {
  type: EmetteurType;
  size?: "sm" | "md";
}) {
  const map: Record<EmetteurType, { label: string; icon: ReactNode; tone: BadgeTone }> = {
    ENTREPRISE: { label: "Entreprise", icon: <Icons.Building size={11} />, tone: "blue" },
    ADMINISTRATION: {
      label: "Administration",
      icon: <Icons.Landmark size={11} />,
      tone: "emerald",
    },
    PARTICULIER: { label: "Particulier", icon: <Icons.User size={11} />, tone: "ember" },
  };
  // Fallback : si le type est inconnu (Convex peut retourner undefined avant codegen),
  // on rend une pill neutre plutot que de crasher la page.
  const entry = map[type] ?? {
    label: "Emploi",
    icon: <Icons.Briefcase size={11} />,
    tone: "neutral" as BadgeTone,
  };
  return (
    <Badge tone={entry.tone} icon={entry.icon} size={size}>
      {entry.label}
    </Badge>
  );
}

// ─── Salaire formatter ───────────────────────────────────────────────────
export function formatXAF(n: number) {
  if (n >= 1_000_000)
    return (
      (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(".", ",") + "M"
    );
  if (n >= 1000) return (n / 1000).toFixed(0) + "k";
  return String(n);
}

export function Salaire({
  min,
  max,
  devise = "XAF",
  compact = false,
}: {
  min?: number;
  max?: number;
  devise?: string;
  compact?: boolean;
}) {
  if (!min) return null;
  if (compact) {
    return (
      <span>
        {formatXAF(min)}
        {max ? `–${formatXAF(max)}` : ""} {devise}
      </span>
    );
  }
  return (
    <span>
      <span className="tnum">{min.toLocaleString("fr-FR")}</span>
      {max && (
        <>
          –<span className="tnum">{max.toLocaleString("fr-FR")}</span>
        </>
      )}{" "}
      <span style={{ color: "var(--fg-subtle)", fontSize: "0.9em" }}>{devise}/mois</span>
    </span>
  );
}

// ─── Bookmark btn ────────────────────────────────────────────────────────
export function BookmarkBtn({
  active,
  onClick,
  size = 18,
}: {
  active?: boolean;
  onClick?: () => void;
  size?: number;
}) {
  const [bouncing, setBouncing] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setBouncing(true);
        setTimeout(() => setBouncing(false), 460);
        onClick?.();
      }}
      aria-label={active ? "Retirer le favori" : "Ajouter aux favoris"}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? "var(--brand-ember)" : "var(--fg-subtle)",
        transition: "background var(--dur-fast), color var(--dur-fast)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-elev-2)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        className={bouncing ? "bookmark-bounce" : ""}
        style={{ display: "inline-flex" }}
      >
        {active ? <Icons.BookmarkF size={size} /> : <Icons.Bookmark size={size} />}
      </span>
    </button>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────
export function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-elev-2)",
          color: accent ?? "var(--brand-blue)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: 38,
          lineHeight: 1,
          letterSpacing: "-0.035em",
          color: "var(--fg)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 6 }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────
export function SectionHeading({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--brand-blue)",
              marginBottom: 6,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "var(--t-h2)",
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: "var(--fg)",
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--fg-muted)",
              fontSize: 15,
              maxWidth: 540,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Skeleton card ───────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 20,
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: 72, height: 14, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: "78%", height: 22, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: 110, height: 22, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}
