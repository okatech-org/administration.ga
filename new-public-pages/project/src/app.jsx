/* App root — routing between profile selector, registration, success; tweaks; device frames */

const { useState: useStateA, useEffect: useEffectA } = React;

const DEFAULT_DATA = /*EDITMODE-BEGIN*/{
  "device": "mobile",
  "aiVariant": "hero",
  "density": "aere",
  "desktopLayout": "split",
  "theme": "light",
  "startScreen": "selector",
  "startStep": 0,
  "startProfile": "long_stay"
}/*EDITMODE-END*/;

function App() {
  const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect } = window;
  const [t, setTweak] = useTweaks(DEFAULT_DATA);

  // Apply theme to <html> so the dark variables cascade everywhere (including
  // any portal'd Tweaks panel that may sit outside the stage).
  useEffectA(() => {
    document.documentElement.classList.toggle("theme-dark", t.theme === "dark");
  }, [t.theme]);

  const isMobile = t.device === "mobile";
  const [screen, setScreen] = useStateA(t.startScreen || "selector"); // selector | registration | submitted
  const [profileType, setProfileType] = useStateA(t.startProfile || "long_stay");
  const [step, setStep] = useStateA(t.startStep || 0);
  const [data, setData] = useStateA({ _aiVariant: t.aiVariant });
  const [aiOpen, setAiOpen] = useStateA(false);
  const [savedAt, setSavedAt] = useStateA("11:32");

  // Update _aiVariant when tweak changes
  useEffectA(() => {
    setData((d) => ({ ...d, _aiVariant: t.aiVariant }));
  }, [t.aiVariant]);

  const steps = STEPS_BY_TYPE[profileType] || STEPS_BY_TYPE.long_stay;
  const currentStep = steps[step];

  const goNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    setSavedAt(new Date().toTimeString().slice(0, 5));
  };
  const goPrev = () => {
    if (step > 0) setStep(step - 1);
  };
  const jumpTo = (i) => {
    if (i >= 0 && i < steps.length) setStep(i);
  };

  const handleSelectProfile = (code) => {
    setProfileType(code);
    setStep(0);
    setScreen("registration");
  };

  const handleAIComplete = () => {
    // Mock: populate fields
    setData({
      ...data,
      firstName: "Berny",
      lastName: "Itoutou",
      birthDate: "1998-02-02",
      birthPlace: "Bikélé",
      birthCountry: "GA",
      gender: "Male",
      nationality: "GA",
      nationalityAcquisition: "birth",
      passportNumber: "24PP13071",
      passportIssuingAuthority: "DGDI MIHINDOU NEE ITOUMBA",
      passportIssueDate: "2024-06-10",
      passportExpiryDate: "2029-06-09",
      address: {
        full: "90 Avenue des Grésillons",
        city: "Asnières-sur-Seine",
        postalCode: "92600",
        country: "FR",
      },
      homeland: { full: "90 Avenue des Grésillons, Asnières-sur-seine", country: "GA" },
      documents: { passport: "passport.pdf", birthCertificate: "acte-naissance.jpg", addressProof: "facture-2024.pdf" },
      _hasAIPrefill: true,
      _identityPhase: "contact", // jump past name
    });
    setAiOpen(false);
  };

  // Render content based on screen
  let content;
  if (screen === "selector") {
    content = <ProfileSelectorScreen onSelect={handleSelectProfile} isMobile={isMobile} />;
  } else if (screen === "submitted") {
    content = (
      <SubmittedScreen
        profileType={profileType}
        onRestart={() => {
          setScreen("selector");
          setStep(0);
          setData({ _aiVariant: t.aiVariant });
        }}
        isMobile={isMobile}
      />
    );
  } else {
    content = (
      <RegistrationScreen
        profileType={profileType}
        steps={steps}
        step={step}
        data={data}
        setData={setData}
        onNext={goNext}
        onPrev={goPrev}
        onJump={jumpTo}
        onSubmit={() => setScreen("submitted")}
        onChangeProfile={() => setScreen("selector")}
        onOpenAI={() => setAiOpen(true)}
        isMobile={isMobile}
        density={t.density}
        desktopLayout={t.desktopLayout}
        savedAt={savedAt}
      />
    );
  }

  const stageClass = `app-stage density-${t.density === "compact" ? "compact" : "aere"}`;

  return (
    <>
      <div className={stageClass}>
        {isMobile ? (
          <div className="mobile-shell">
            <StatusBar />
            {content}
            <div className="home-indicator" />
            <AIPrefillSheet open={aiOpen} onClose={() => setAiOpen(false)} onComplete={handleAIComplete} isMobile />
          </div>
        ) : (
          <div className="desktop-shell">
            {content}
            <AIPrefillSheet open={aiOpen} onClose={() => setAiOpen(false)} onComplete={handleAIComplete} />
          </div>
        )}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Affichage">
          <TweakRadio
            label="Thème"
            value={t.theme}
            options={[
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
            ]}
            onChange={(v) => setTweak("theme", v)}
          />
          <TweakRadio
            label="Appareil"
            value={t.device}
            options={[
              { value: "mobile", label: "Mobile" },
              { value: "desktop", label: "Desktop" },
            ]}
            onChange={(v) => setTweak("device", v)}
          />
          <TweakSelect
            label="Densité"
            value={t.density}
            options={[
              { value: "aere", label: "Aérée" },
              { value: "compact", label: "Compacte" },
            ]}
            onChange={(v) => setTweak("density", v)}
          />
          {!isMobile && (
            <TweakRadio
              label="Layout desktop"
              value={t.desktopLayout}
              options={[
                { value: "centered", label: "Centré" },
                { value: "split", label: "Sidebar récap" },
              ]}
              onChange={(v) => setTweak("desktopLayout", v)}
            />
          )}
        </TweakSection>

        <TweakSection title="Invitation IA">
          <TweakSelect
            label="Style sur étape 1"
            value={t.aiVariant}
            options={[
              { value: "banner", label: "Banner discret" },
              { value: "hero", label: "Hero card (mis en avant)" },
              { value: "sticky", label: "Bouton sticky" },
            ]}
            onChange={(v) => setTweak("aiVariant", v)}
          />
        </TweakSection>

        <TweakSection title="Navigation rapide">
          <TweakSelect
            label="Profil"
            value={profileType}
            options={[
              { value: "long_stay", label: "Long séjour (résident)" },
              { value: "short_stay", label: "Court séjour" },
              { value: "foreigner", label: "Étranger" },
            ]}
            onChange={(v) => {
              setProfileType(v);
              setStep(0);
              setScreen("registration");
            }}
          />
          <TweakSelect
            label="Écran"
            value={screen}
            options={[
              { value: "selector", label: "Sélecteur de profil" },
              { value: "registration", label: "Formulaire" },
              { value: "submitted", label: "Confirmation envoi" },
            ]}
            onChange={(v) => setScreen(v)}
          />
          {screen === "registration" && (
            <TweakSelect
              label="Étape"
              value={String(step)}
              options={steps.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.label}` }))}
              onChange={(v) => setStep(parseInt(v, 10))}
            />
          )}
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

/* ---------------- Profile selector screen ---------------- */

function ProfileSelectorScreen({ onSelect, isMobile }) {
  if (isMobile) {
    return (
      <>
        <MobileHeader showLogo />
        <div className="mobile-body" style={{ padding: "24px 20px 32px" }}>
          <div className="gabon-stripe mb-2" />
          <h1 style={{ marginTop: 8 }}>Bienvenue sur le Portail Consulaire</h1>
          <p className="text-muted mt-2" style={{ fontSize: 15 }}>
            Sélectionnez votre profil pour commencer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
            {PROFILE_TYPES.map((p, i) => (
              <ProfileCard key={p.code} profile={p} onSelect={onSelect} recommended={i === 0} />
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              padding: "14px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              gap: 10,
            }}
          >
            <Icon name="info" size={16} style={{ color: "var(--gabon-blue)", flexShrink: 0, marginTop: 1 }} />
            <span>
              Déjà inscrit ?{" "}
              <a href="#" style={{ color: "var(--gabon-blue)", fontWeight: 500 }}>
                Se connecter
              </a>{" "}
              à votre espace personnel.
            </span>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <SiteHeader />
      <div style={{ padding: "48px 32px 64px", maxWidth: 1120, margin: "0 auto" }}>
        <div className="gabon-stripe mb-2" />
        <h1 style={{ fontSize: 36, marginTop: 12 }}>Bienvenue sur le Portail Consulaire</h1>
        <p className="text-muted mt-3" style={{ fontSize: 17, maxWidth: 640 }}>
          Sélectionnez votre profil pour commencer l'inscription. Le processus prend environ
          10 minutes — moins de 3 minutes avec le pré-remplissage par IA.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            marginTop: 36,
          }}
        >
          {PROFILE_TYPES.map((p, i) => (
            <ProfileCard key={p.code} profile={p} onSelect={onSelect} recommended={i === 0} />
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

/* ---------------- Registration screen (multi-step shell) ---------------- */

function RegistrationScreen({
  profileType,
  steps,
  step,
  data,
  setData,
  onNext,
  onPrev,
  onJump,
  onSubmit,
  onChangeProfile,
  onOpenAI,
  isMobile,
  density,
  desktopLayout,
  savedAt,
}) {
  const currentStep = steps[step];

  const renderStepBody = () => {
    switch (currentStep.key) {
      case "identity":
        return (
          <IdentityStep
            data={data}
            setData={setData}
            onNext={onNext}
            onOpenAI={onOpenAI}
            isMobile={isMobile}
            density={density}
            profileType={profileType}
          />
        );
      case "family":
        return <FamilyStep data={data} setData={setData} />;
      case "contacts":
        return <ContactsStep data={data} setData={setData} profileType={profileType} />;
      case "profession":
        return <ProfessionStep data={data} setData={setData} />;
      case "documents":
        return (
          <DocumentsStep
            data={data}
            setData={setData}
            profileType={profileType}
            hasAIPrefill={data._hasAIPrefill}
          />
        );
      case "review":
        return (
          <ReviewStep
            data={data}
            profileType={profileType}
            onJump={onJump}
            onSubmit={onSubmit}
          />
        );
      default:
        return null;
    }
  };

  // Identity step has its own internal nav; others get standard footer
  const showStandardNav = currentStep.key !== "identity" && currentStep.key !== "review";

  if (isMobile) {
    const progress = ((step + 1) / steps.length) * 100;
    return (
      <>
        <MobileHeader onBack={step === 0 ? onChangeProfile : onPrev} savedAt={savedAt} />
        <div style={{ padding: "12px 20px 6px", background: "var(--bg)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name={currentStep.icon} size={14} style={{ color: "var(--gabon-blue)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{currentStep.label}</span>
            </div>
            <span className="text-mono text-xs text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
              {step + 1} / {steps.length}
            </span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className={`mobile-body density-${density === "compact" ? "compact" : "aere"}`} style={{ padding: "20px 20px 0" }}>
          {renderStepBody()}
        </div>
        {showStandardNav && (
          <div className="action-bar">
            <button className="btn btn-ghost" onClick={onPrev} disabled={step === 0}>
              <Icon name="arrow-left" size={16} />
            </button>
            <button className="btn btn-primary flex-1 btn-lg" onClick={onNext}>
              Continuer <Icon name="arrow-right" size={16} />
            </button>
          </div>
        )}
      </>
    );
  }

  // Desktop layout
  const showSidebar = desktopLayout === "split";

  return (
    <>
      <SiteHeader minimal />
      <div
        className={`density-${density === "compact" ? "compact" : "aere"}`}
        style={{
          display: "grid",
          gridTemplateColumns: showSidebar ? "260px 1fr 320px" : "1fr",
          maxWidth: showSidebar ? 1280 : 880,
          margin: "0 auto",
          padding: showSidebar ? "32px 32px 64px" : "40px 32px 64px",
          gap: 32,
        }}
      >
        {showSidebar && (
          <aside style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <button className="btn btn-text btn-sm" onClick={onChangeProfile} style={{ paddingLeft: 0 }}>
              <Icon name="arrow-left" size={14} /> Changer de profil
            </button>
            <div className="text-muted text-xs mt-4" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {PROFILE_TITLES[profileType]}
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
              {steps.map((s, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <li
                    key={s.key}
                    onClick={() => (done || cur) && onJump(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: cur ? "var(--gabon-blue-tint)" : "transparent",
                      cursor: done || cur ? "pointer" : "default",
                      color: cur ? "var(--gabon-blue)" : done ? "var(--text)" : "var(--text-faint)",
                      fontSize: 14,
                      fontWeight: cur ? 600 : 500,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 100,
                        background: done ? "var(--gabon-blue)" : cur ? "var(--surface)" : "var(--surface-2)",
                        border: cur ? "1.5px solid var(--gabon-blue)" : "1.5px solid var(--border-strong)",
                        color: done ? "#fff" : cur ? "var(--gabon-blue)" : "var(--text-muted)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {done ? <Icon name="check" size={12} stroke={3} /> : i + 1}
                    </span>
                    {s.label}
                  </li>
                );
              })}
            </ol>
            <div className="mt-6" style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div className="text-muted text-xs" style={{ marginBottom: 4 }}>Progression globale</div>
              <div className="progress" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
              </div>
              <div className="text-muted text-xs mt-2">
                Étape {step + 1} sur {steps.length}
              </div>
            </div>
          </aside>
        )}

        <main style={{ minWidth: 0 }}>
          {!showSidebar && (
            <>
              <button className="btn btn-text btn-sm" onClick={onChangeProfile} style={{ paddingLeft: 0, marginBottom: 16 }}>
                <Icon name="arrow-left" size={14} /> Changer de profil
              </button>
              <div style={{ marginBottom: 24 }}>
                <Stepper steps={steps} current={step} onJump={onJump} />
              </div>
            </>
          )}

          <div className="card stripe-top" style={{ overflow: "hidden" }}>
            <div className="card-pad" style={{ padding: 32 }}>
              {renderStepBody()}
              {showStandardNav && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button className="btn btn-ghost" onClick={onPrev} disabled={step === 0}>
                    <Icon name="arrow-left" size={16} /> Précédent
                  </button>
                  <button className="btn btn-primary btn-lg" onClick={onNext}>
                    Continuer <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {showSidebar && (
          <aside style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <div className="card card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Récapitulatif
                </strong>
                <span className="pill pill-success" style={{ fontSize: 11, padding: "2px 8px" }}>
                  <Icon name="check" size={10} /> {savedAt}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <SidebarLine label="Profil" value={PROFILE_TYPES.find((p) => p.code === profileType)?.title || profileType} />
                <SidebarLine
                  label="Nom complet"
                  value={[data.firstName, data.lastName].filter(Boolean).join(" ") || "—"}
                />
                <SidebarLine label="Email" value={data.email || "—"} />
                <SidebarLine label="Téléphone" value={data.phone || "—"} />
                <SidebarLine label="Date de naissance" value={data.birthDate || "—"} />
                <SidebarLine label="Nationalité" value={countryByCode(data.nationality)?.name || "—"} />
                <SidebarLine
                  label="Adresse"
                  value={data.address?.full ? `${data.address.full}, ${data.address.city || ""}` : "—"}
                />
                <SidebarLine label="Documents" value={`${Object.keys(data.documents || {}).length} fourni(s)`} />
              </div>
            </div>

            <div className="card card-pad mt-4">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Icon name="info" size={16} style={{ color: "var(--gabon-blue)" }} />
                <strong style={{ fontSize: 13 }}>Besoin d'aide ?</strong>
              </div>
              <p className="text-muted text-sm">
                Notre équipe est disponible du lundi au vendredi, 8h-18h.
              </p>
              <button className="btn btn-ghost btn-sm btn-block mt-3">
                Contacter le support
              </button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

const SidebarLine = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <span className="text-muted" style={{ fontSize: 12 }}>{label}</span>
    <span
      style={{
        fontWeight: 500,
        textAlign: "right",
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  </div>
);

/* ---------------- Mount ---------------- */

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
