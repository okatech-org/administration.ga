"use client";

/**
 * Offres favorites — TRAVAIL.GA.
 *
 * Liste les offres mises de côté par l'utilisateur. Les favoris sont
 * stockés en local (localStorage) via le hook `useFavoris`. Les vraies
 * shortlists D.E sont gérées côté PNPE.GA (synchronisation conseiller).
 */

import Link from "next/link";
import { useMemo } from "react";
import { useFavoris } from "@/lib/use-favoris";
import { MOCK_OFFRES } from "@/lib/travail-mock-data";
import { JobCard } from "@/components/design/job-card";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";
import { offreHref } from "@/lib/utils";

export default function FavorisPage() {
  const { isFavori, toggle, count } = useFavoris();
  const favoris = useMemo(
    () => MOCK_OFFRES.filter((o) => isFavori(o.ref)),
    [isFavori],
  );

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <Badge
          tone="ember"
          icon={<Icons.Heart size={11} />}
          style={{ marginBottom: 12 }}
        >
          Offres favorites · {count}
        </Badge>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1.05 }}
        >
          Mes offres favorites
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-muted)",
            fontSize: 14.5,
            maxWidth: 580,
          }}
        >
          Retrouvez les offres que vous avez sauvegardées. Stockage local
          dans votre navigateur — synchronisé avec votre compte PNPE.GA
          après inscription D.E.
        </p>
      </div>

      {favoris.length === 0 ? (
        <div
          style={{
            background: "var(--bg-elev-1)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--r-xl)",
            padding: 48,
            textAlign: "center",
          }}
        >
          <Icons.Bookmark
            size={42}
            style={{ color: "var(--fg-subtle)", margin: "0 auto 14px" }}
          />
          <h2
            className="font-display"
            style={{ margin: "0 0 8px", fontSize: 20, letterSpacing: "-0.02em" }}
          >
            Aucune offre en favoris
          </h2>
          <p
            style={{
              margin: "0 0 22px",
              color: "var(--fg-muted)",
              fontSize: 14,
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            Cliquez sur l&apos;icône favori d&apos;une offre pour la garder
            sous la main. Idéal pour comparer plusieurs opportunités avant de
            postuler.
          </p>
          <Link href="/offres" style={{ textDecoration: "none" }}>
            <Button iconRight={<Icons.ArrowR size={14} />}>
              Parcourir les offres
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className="travail-favoris-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {favoris.map((o, i) => (
            <Link
              key={o.id}
              href={offreHref(o.ref)}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <JobCard
                offre={o}
                density="regular"
                index={i}
                bookmarked
                onBookmark={() => toggle(o.ref)}
              />
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .travail-favoris-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
