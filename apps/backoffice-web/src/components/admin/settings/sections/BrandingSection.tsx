"use client";

/**
 * BrandingSection — Identité visuelle et page publique (Phase 3)
 *
 * Couverture :
 *   - Couleurs primaire/secondaire/accent (page publique)
 *   - Description publique multilingue (FR + EN + langue locale)
 *   - Liens réseaux sociaux
 *   - Toggle publication d'actualités sur la page publique
 *
 * NOTE : L'upload de logo/bannière/photos via Convex Storage est géré dans une
 * passe ultérieure (nécessite composant d'upload dédié). Pour l'instant, on
 * gère les URLs et préférences.
 */

import { api } from "@convex/_generated/api";
import {
  Globe2,
  Link as LinkIcon,
  Newspaper,
  Palette,
  Share2,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FlatCard } from "@/components/design-system/flat-card";
import { SectionHeader } from "@/components/design-system/section-header";
import { HelpTooltip } from "@/components/admin/HelpTooltip";
import { HELP } from "@/lib/help-content";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks";
import { LocalizedField, type LocalizedValue } from "../LocalizedField";
import type { SettingsSectionProps } from "../SettingsTabsLayout";
import {
  useDebouncedSave,
  useRegisterSection,
  useSettingsFormOptional,
} from "@workspace/settings-form";

export function BrandingSection({
  orgId,
  onStatusChange,
}: SettingsSectionProps) {
  const ctx = useSettingsFormOptional();
  const readOnly = ctx?.readOnly ?? false;

  const { data: org, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.getById,
    { orgId },
  );

  const { mutateAsync: updateBranding } = useConvexMutationQuery(
    api.functions.orgs.updateBranding,
  );

  const [primaryColor, setPrimaryColor] = useState("#0A3172");
  const [secondaryColor, setSecondaryColor] = useState("#FFD900");
  const [accentColor, setAccentColor] = useState("#009E60");

  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descLocal, setDescLocal] = useState("");

  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [publishNews, setPublishNews] = useState(false);

  const { trigger, flush, hasPending, status, errorMessage } = useDebouncedSave<void>({
    readOnly,
    onSave: async () => {
      await updateBranding({
        orgId,
        branding: {
          colors: {
            primary: primaryColor,
            secondary: secondaryColor || undefined,
            accent: accentColor || undefined,
          },
          publicDescription:
            descFr || descEn || descLocal
              ? {
                  fr: descFr || undefined,
                  en: descEn || undefined,
                  local: descLocal || undefined,
                }
              : undefined,
          socialLinks: {
            facebook: facebook || undefined,
            twitter: twitter || undefined,
            linkedin: linkedin || undefined,
            instagram: instagram || undefined,
            youtube: youtube || undefined,
          },
          publishNews,
        },
      });
    },
    onStatusChange,
    onDirtyChange: (dirty) => ctx?.notifySectionDirty("branding", dirty),
  });

  useRegisterSection("branding", { flush, hasPending, status, errorMessage });

  // Synchro serveur — BUG FIX #4 : skip si modifs pending (race condition).
  useEffect(() => {
    if (!org) return;
    if (hasPending()) return;
    const b = org.branding ?? {};
    setPrimaryColor(b.colors?.primary ?? "#0A3172");
    setSecondaryColor(b.colors?.secondary ?? "#FFD900");
    setAccentColor(b.colors?.accent ?? "#009E60");
    setDescFr(b.publicDescription?.fr ?? "");
    setDescEn(b.publicDescription?.en ?? "");
    setDescLocal(b.publicDescription?.local ?? "");
    setFacebook(b.socialLinks?.facebook ?? "");
    setTwitter(b.socialLinks?.twitter ?? "");
    setLinkedin(b.socialLinks?.linkedin ?? "");
    setInstagram(b.socialLinks?.instagram ?? "");
    setYoutube(b.socialLinks?.youtube ?? "");
    setPublishNews(b.publishNews ?? false);
  }, [org, hasPending]);

  const push = () => trigger();

  if (isPending) return <BrandingSkeleton />;
  if (!org) return null;

  return (
    <div className="space-y-4">
      {/* ─── Couleurs ──────────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Palette className="h-4 w-4 text-purple-600" />}
              title="Couleurs de marque"
            />
            <HelpTooltip content={HELP.branding.colors} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Palette de la page publique de la représentation. Les couleurs du
            Gabon (vert / jaune / bleu) sont utilisées par défaut.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ColorField
              label="Primaire"
              value={primaryColor}
              onChange={(v) => {
                setPrimaryColor(v);
                push();
              }}
            />
            <ColorField
              label="Secondaire"
              value={secondaryColor}
              onChange={(v) => {
                setSecondaryColor(v);
                push();
              }}
            />
            <ColorField
              label="Accent"
              value={accentColor}
              onChange={(v) => {
                setAccentColor(v);
                push();
              }}
            />
          </div>
          {/* Aperçu palette */}
          <div className="mt-4 flex gap-2 h-16 rounded-lg overflow-hidden border border-border/50">
            <div
              className="flex-1 flex items-center justify-center text-xs font-medium text-white"
              style={{ background: primaryColor }}
            >
              Primaire
            </div>
            <div
              className="flex-1 flex items-center justify-center text-xs font-medium"
              style={{ background: secondaryColor }}
            >
              Secondaire
            </div>
            <div
              className="flex-1 flex items-center justify-center text-xs font-medium text-white"
              style={{ background: accentColor }}
            >
              Accent
            </div>
          </div>
        </div>
      </FlatCard>

      {/* ─── Description publique ──────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <SectionHeader
              icon={<Globe2 className="h-4 w-4 text-blue-600" />}
              title="Description publique"
            />
            <HelpTooltip content={HELP.branding.publicDescription} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Texte affiché sur la page publique de la représentation. Visible par
            tous les citoyens et partenaires.
          </p>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <LocalizedField
              multiline
              rows={4}
              locales={["fr", "en", "local"]}
              value={{ fr: descFr, en: descEn, local: descLocal }}
              placeholder={{
                fr: "L'Ambassade de la République Gabonaise en Espagne accueille la diaspora gabonaise et travaille activement au renforcement des liens bilatéraux…",
                en: "The Embassy of the Gabonese Republic welcomes the Gabonese diaspora and works to strengthen bilateral ties…",
                local: "Traduction dans la langue du pays d'accueil (espagnol, portugais, arabe, etc.)",
              }}
              onChange={(next: LocalizedValue) => {
                const fr = next.fr ?? "";
                const en = next.en ?? "";
                const local = next.local ?? "";
                setDescFr(fr);
                setDescEn(en);
                setDescLocal(local);
                push();
              }}
            />
          </Field>
        </div>
      </FlatCard>

      {/* ─── Réseaux sociaux ──────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <SectionHeader
            icon={<Share2 className="h-4 w-4 text-blue-600" />}
            title="Réseaux sociaux"
          />
          <div className="space-y-3">
            <SocialField
              icon={LinkIcon}
              label="Facebook"
              value={facebook}
              placeholder="https://facebook.com/consulat-gabon-madrid"
              onChange={(v) => {
                setFacebook(v);
                push();
              }}
            />
            <SocialField
              icon={LinkIcon}
              label="Twitter / X"
              value={twitter}
              placeholder="https://x.com/consulat_ga"
              onChange={(v) => {
                setTwitter(v);
                push();
              }}
            />
            <SocialField
              icon={LinkIcon}
              label="LinkedIn"
              value={linkedin}
              placeholder="https://linkedin.com/company/…"
              onChange={(v) => {
                setLinkedin(v);
                push();
              }}
            />
            <SocialField
              icon={LinkIcon}
              label="Instagram"
              value={instagram}
              placeholder="https://instagram.com/consulat_ga"
              onChange={(v) => {
                setInstagram(v);
                push();
              }}
            />
            <SocialField
              icon={Video}
              label="YouTube"
              value={youtube}
              placeholder="https://youtube.com/@consulat-ga"
              onChange={(v) => {
                setYoutube(v);
                push();
              }}
            />
          </div>
        </div>
      </FlatCard>

      {/* ─── Actualités ────────────────────────────────── */}
      <FlatCard>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Newspaper className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Publier les actualités</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Affiche les annonces et communiqués de la représentation sur
                  la page publique, consultable par tous les citoyens.
                </p>
              </div>
            </div>
            <Switch
              checked={publishNews}
              onCheckedChange={(v) => {
                setPublishNews(v);
                push();
              }}
            />
          </div>
        </div>
      </FlatCard>
    </div>
  );
}

// ─── Champ couleur ──────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2 items-center">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          placeholder="#0A3172"
        />
      </div>
    </Field>
  );
}

// ─── Champ réseau social ────────────────────────────
function SocialField({
  icon: Icon,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: typeof LinkIcon;
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className="h-4 w-4 text-muted-foreground shrink-0"
        aria-label={label}
      />
      <div className="flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type="url"
          aria-label={label}
        />
      </div>
    </div>
  );
}

function BrandingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <FlatCard key={i}>
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
          </div>
        </FlatCard>
      ))}
    </div>
  );
}
