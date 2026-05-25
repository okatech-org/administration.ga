/**
 * HeroScrollAnimation TRAVAIL.GA.
 * Bento grid 8×4 avec 5 images Unsplash qui scale-in + translate-X
 * pendant le scroll. Texte central qui fade out / scale down.
 * Source : design Claude `hero-scroll.jsx`.
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icons } from "./icons";
import { Button } from "./ui";

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => outMin + (outMax - outMin) * clamp01((v - inMin) / (inMax - inMin));

function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      setP(clamp01(total > 0 ? scrolled / total : 0));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

type HeroImage = {
  src: string;
  grad: string;
  alt: string;
};

const HERO_IMAGES: HeroImage[] = [
  {
    src: "https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=1400&q=80&auto=format&fit=crop",
    grad: "linear-gradient(135deg, #1B4D8C 0%, #163E70 100%)",
    alt: "Cadre administratif",
  },
  {
    src: "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=900&q=80&auto=format&fit=crop",
    grad: "linear-gradient(135deg, #16A37B 0%, #0F8665 100%)",
    alt: "Professionnelle bancaire",
  },
  {
    src: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=900&q=80&auto=format&fit=crop",
    grad: "linear-gradient(135deg, #E29021 0%, #B97412 100%)",
    alt: "Ingénieure laboratoire",
  },
  {
    src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1000&q=80&auto=format&fit=crop",
    grad: "linear-gradient(135deg, #B86A3A 0%, #A06038 100%)",
    alt: "Jeune professionnel",
  },
  {
    src: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=1000&q=80&auto=format&fit=crop",
    grad: "linear-gradient(135deg, #1B4D8C 0%, #16A37B 100%)",
    alt: "Cadre entreprise",
  },
];

function HeroBentoImage({ img }: { img: HeroImage }) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundImage: errored ? img.grad : "none",
        backgroundColor: errored ? undefined : "var(--bg-elev-2)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-3)",
        position: "relative",
      }}
    >
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img.src}
          alt={img.alt}
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(15,20,30,0.08) 0%, rgba(15,20,30,0.18) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const PLACEMENTS: { gc: string; gr: string }[] = [
  { gc: "1 / 7", gr: "1 / 4" },
  { gc: "7 / 9", gr: "1 / 3" },
  { gc: "7 / 9", gr: "3 / 5" },
  { gc: "1 / 4", gr: "4 / 5" },
  { gc: "4 / 7", gr: "4 / 5" },
];

const ORIGINS = [
  "top right",
  "center",
  "bottom right",
  "top left",
  "top right",
];

export function HeroScrollAnimation() {
  const containerRef = useRef<HTMLElement>(null);
  const p = useScrollProgress(containerRef);

  const imgTranslateX = remap(p, 0.1, 0.9, -28, 0);
  const imgScale = remap(p, 0, 0.9, 0.62, 1);
  const textProg = clamp01(p / 0.5);
  const textOpacity = 1 - textProg;
  const textScale = 1 - textProg * 0.4;

  return (
    <section
      ref={containerRef}
      aria-label="Hero TRAVAIL.GA"
      style={{
        position: "relative",
        minHeight: "300vh",
        background:
          "linear-gradient(180deg, var(--bg) 0%, var(--bg-elev-2) 60%, var(--bg) 100%)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          padding: 24,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Bento grid */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gridTemplateRows: "1fr 0.5fr 0.5fr 1fr",
            gap: 14,
            zIndex: 1,
          }}
        >
          {HERO_IMAGES.map((img, i) => (
            <div
              key={i}
              style={{
                gridColumn: PLACEMENTS[i]?.gc,
                gridRow: PLACEMENTS[i]?.gr,
                transformOrigin: ORIGINS[i],
                transform: `translateX(${imgTranslateX}%) scale(${imgScale})`,
                willChange: "transform",
              }}
            >
              <HeroBentoImage img={img} />
            </div>
          ))}
        </div>

        {/* Center scaling text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            opacity: textOpacity,
            transform: `scale(${textScale})`,
            transformOrigin: "center center",
            pointerEvents: textOpacity > 0.3 ? "auto" : "none",
            padding: "0 24px",
            willChange: "transform, opacity",
          }}
        >
          <div
            style={{
              maxWidth: 760,
              textAlign: "center",
              padding: "36px 32px",
              background:
                "color-mix(in oklab, var(--bg) 78%, transparent)",
              backdropFilter: "blur(18px) saturate(160%)",
              WebkitBackdropFilter: "blur(18px) saturate(160%)",
              borderRadius: 24,
              border:
                "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
              boxShadow: "var(--shadow-4)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                borderRadius: 999,
                background: "var(--brand-emerald-50)",
                color: "var(--brand-emerald)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 22,
                border:
                  "1px solid color-mix(in oklab, var(--brand-emerald) 30%, transparent)",
              }}
            >
              <Icons.ShieldCheck size={13} /> Service public — partenaire
              officiel PNPE
            </div>
            <h1
              className="font-display"
              style={{
                margin: 0,
                fontSize: "clamp(44px, 6.5vw + 12px, 92px)",
                lineHeight: 0.95,
                color: "var(--fg)",
                marginBottom: 22,
              }}
            >
              Le marché de l&apos;emploi
              <br />
              <span style={{ color: "var(--brand-ember)" }}>gabonais.</span>
              <br />
              En un seul lieu.
            </h1>
            <p
              style={{
                margin: "0 auto 30px",
                fontSize: "clamp(15px, 0.4vw + 14px, 17px)",
                color: "var(--fg-muted)",
                maxWidth: 560,
                lineHeight: 1.55,
              }}
            >
              Toutes les offres validées par le Pôle National de Promotion de
              l&apos;Emploi — entreprises, administrations, particuliers et
              porteurs Auto-Emploi. Sans intermédiaire, sans frais.
            </p>
            <div
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <Link href="/offres" style={{ textDecoration: "none" }}>
                <Button size="lg" icon={<Icons.Search size={16} />}>
                  Parcourir les offres
                </Button>
              </Link>
              <Link href="/publier-annonce" style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="secondary"
                  icon={<Icons.Plus size={16} />}
                >
                  Publier une annonce
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          style={
            {
              position: "absolute",
              bottom: 28,
              left: "50%",
              transform: `translateX(-50%) translateY(${textOpacity > 0.3 ? 0 : 8}px)`,
              opacity: textOpacity,
              fontSize: 11.5,
              fontWeight: 550,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "opacity var(--dur-base), transform var(--dur-base)",
              zIndex: 3,
            } satisfies CSSProperties
          }
        >
          <span>Faites défiler</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 28,
              borderRadius: 999,
              border: "1.5px solid var(--fg-muted)",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 5,
                width: 2,
                height: 6,
                borderRadius: 1,
                background: "var(--fg-muted)",
                animation: "scrollHint 1.6s var(--ease-out) infinite",
              }}
            />
          </span>
        </div>
      </div>
    </section>
  );
}
