/* Multi-step registration flow + all individual steps */

const { useState: useStateR, useMemo: useMemoR } = React;

/* ---------------- Step configurations by profile type ---------------- */

const STEPS_BY_TYPE = {
  long_stay: [
    { key: "identity", label: "Identité", icon: "user" },
    { key: "family", label: "Famille", icon: "users" },
    { key: "contacts", label: "Contacts", icon: "map-pin" },
    { key: "profession", label: "Profession", icon: "briefcase" },
    { key: "documents", label: "Documents", icon: "file-text" },
    { key: "review", label: "Révision", icon: "eye" },
  ],
  short_stay: [
    { key: "identity", label: "Identité", icon: "user" },
    { key: "contacts", label: "Contacts", icon: "map-pin" },
    { key: "documents", label: "Documents", icon: "file-text" },
    { key: "review", label: "Révision", icon: "eye" },
  ],
  foreigner: [
    { key: "identity", label: "Identité", icon: "user" },
    { key: "contacts", label: "Contacts", icon: "map-pin" },
    { key: "documents", label: "Documents", icon: "file-text" },
    { key: "review", label: "Révision", icon: "eye" },
  ],
};

const PROFILE_TITLES = {
  long_stay: "Inscription consulaire — Résident",
  short_stay: "Déclaration — Court séjour",
  foreigner: "Demande de services — Étranger",
};

/* ---------------- Step 1: Identity (Typeform-style unfolding) ---------------- */

const IdentityStep = ({ data, setData, onNext, onOpenAI, isMobile, density, profileType }) => {
  // Phases:
  // 'name' → 'contact' → 'otp' → 'birth' → 'passport' (only if needs passport)
  const phases = profileType === "short_stay" || profileType === "foreigner"
    ? ["name", "contact", "password", "otp", "pin", "birth", "passport"]
    : ["name", "contact", "password", "otp", "pin", "birth", "passport"];

  const [phase, setPhase] = useStateR(data._identityPhase || "name");
  const setPhaseAndSave = (p) => {
    setPhase(p);
    setData({ ...data, _identityPhase: p });
  };

  const phaseIdx = phases.indexOf(phase);
  const phaseProgress = ((phaseIdx + 1) / phases.length) * 100;

  const next = () => {
    const i = phases.indexOf(phase);
    if (i < phases.length - 1) setPhaseAndSave(phases[i + 1]);
    else onNext();
  };
  const prev = () => {
    const i = phases.indexOf(phase);
    if (i > 0) setPhaseAndSave(phases[i - 1]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Sub-progress inside the identity step */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span className="text-mono text-xs text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
          {String(phaseIdx + 1).padStart(2, "0")} / {String(phases.length).padStart(2, "0")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {phases.map((_, i) => {
            const done = i < phaseIdx;
            const cur = i === phaseIdx;
            return (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  height: 5,
                  width: cur ? 22 : 12,
                  borderRadius: 100,
                  background: done || cur ? "var(--gabon-blue)" : "var(--border)",
                  opacity: done ? 0.55 : 1,
                  transition: "width 240ms cubic-bezier(0.2,0.7,0.2,1), background 200ms, opacity 200ms",
                }}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted">
          {phase === "name" && "Votre nom"}
          {phase === "contact" && "Vos coordonnées"}
          {phase === "password" && "Mot de passe"}
          {phase === "otp" && "Vérification email"}
          {phase === "pin" && "Code PIN"}
          {phase === "birth" && "Naissance & nationalité"}
          {phase === "passport" && "Passeport"}
        </span>
      </div>

      {phase === "name" && (
        <NamePhase data={data} setData={setData} onNext={next} onOpenAI={onOpenAI} isMobile={isMobile} />
      )}
      {phase === "contact" && (
        <ContactPhase data={data} setData={setData} onNext={next} onPrev={prev} />
      )}
      {phase === "password" && (
        <PasswordPhase data={data} setData={setData} onNext={next} onPrev={prev} />
      )}
      {phase === "otp" && (
        <OtpPhase data={data} setData={setData} onNext={next} onPrev={prev} />
      )}
      {phase === "pin" && (
        <PinPhase data={data} setData={setData} onNext={next} onPrev={prev} isMobile={isMobile} />
      )}
      {phase === "birth" && (
        <BirthPhase data={data} setData={setData} onNext={next} onPrev={prev} />
      )}
      {phase === "passport" && (
        <PassportPhase data={data} setData={setData} onNext={next} onPrev={prev} />
      )}
    </div>
  );
};

const NamePhase = ({ data, setData, onNext, onOpenAI, isMobile }) => {
  const canContinue = data.firstName && data.lastName && data.firstName.length >= 2 && data.lastName.length >= 2;
  return (
    <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Bonjour, comment vous appelez-vous ?</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Ces informations figureront sur votre dossier consulaire. Elles doivent correspondre à
          votre passeport.
        </p>
      </div>
      <div className="col">
        <Field label="Prénom" required>
          <TextInput
            value={data.firstName}
            onChange={(v) => setData({ ...data, firstName: v })}
            placeholder="Berny"
            autoFocus
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nom de famille" required>
          <TextInput
            value={data.lastName}
            onChange={(v) => setData({ ...data, lastName: v })}
            placeholder="Itoutou"
            autoComplete="family-name"
          />
        </Field>
      </div>

      <AIInvite variant={data._aiVariant || "banner"} onClick={onOpenAI} isMobile={isMobile} />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!canContinue}>
          Continuer <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
};

const ContactPhase = ({ data, setData, onNext, onPrev }) => {
  const canContinue = data.email && /.+@.+\..+/.test(data.email) && data.phone && data.phone.length >= 6;
  return (
    <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Vos coordonnées</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Nous enverrons un code de vérification à votre email. Votre numéro nous permettra de vous
          contacter en cas de besoin.
        </p>
      </div>
      <div className="col">
        <Field label="Email" required hint="Vous recevrez un code de vérification">
          <TextInput
            type="email"
            value={data.email}
            onChange={(v) => setData({ ...data, email: v })}
            placeholder="vous@exemple.com"
            autoFocus
            autoComplete="email"
          />
        </Field>
        <Field label="Téléphone" required>
          <TextInput
            type="tel"
            value={data.phone}
            onChange={(v) => setData({ ...data, phone: v })}
            placeholder="+33 6 12 34 56 78"
            autoComplete="tel"
          />
        </Field>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "10px 12px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <Icon name="shield" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Vos coordonnées sont chiffrées. En continuant, vous acceptez les{" "}
          <a href="#" style={{ color: "var(--gabon-blue)" }}>conditions d'utilisation</a> et la{" "}
          <a href="#" style={{ color: "var(--gabon-blue)" }}>politique de confidentialité</a>.
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onPrev}>
          <Icon name="arrow-left" size={16} />Retour
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!canContinue}>
          Continuer <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
};

const PasswordPhase = ({ data, setData, onNext, onPrev }) => {
  const [show, setShow] = useStateR(false);
  const pwd = data.password || "";
  const confirm = data.passwordConfirm || "";

  const checks = {
    length: pwd.length >= 10,
    upper: /[A-Z]/.test(pwd),
    digit: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const strengthLabel = ["Trop court", "Faible", "Moyen", "Bon", "Excellent"][score];
  const strengthColor = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--gabon-blue)", "var(--success)"][score];

  const match = pwd && confirm && pwd === confirm;
  const canContinue = score >= 3 && match;

  return (
    <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Créez votre mot de passe</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Il sécurisera l'accès à votre espace consulaire. Choisissez-en un solide, vous l'utiliserez à chaque connexion.
        </p>
      </div>

      <Field
        label="Mot de passe"
        required
        hint="Au moins 10 caractères, une majuscule, un chiffre et un symbole"
      >
        <div style={{ position: "relative" }}>
          <TextInput
            type={show ? "text" : "password"}
            value={pwd}
            onChange={(v) => setData({ ...data, password: v })}
            placeholder="••••••••••"
            autoFocus
            autoComplete="new-password"
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              color: "var(--text-muted)",
              display: "grid",
              placeItems: "center",
              borderRadius: 6,
            }}
          >
            <Icon name="eye" size={16} />
          </button>
        </div>
      </Field>

      {/* Strength meter */}
      {pwd && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i < score ? strengthColor : "var(--border)",
                  transition: "background 200ms",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span className="text-muted">Robustesse</span>
            <span style={{ color: strengthColor, fontWeight: 500 }}>{strengthLabel}</span>
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 16px",
              fontSize: 12,
            }}
          >
            {[
              ["length", "10 caractères"],
              ["upper", "Une majuscule"],
              ["digit", "Un chiffre"],
              ["symbol", "Un symbole"],
            ].map(([k, label]) => (
              <li
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: checks[k] ? "var(--success)" : "var(--text-faint)",
                }}
              >
                <Icon name={checks[k] ? "check" : "x"} size={12} stroke={2.5} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field
        label="Confirmer le mot de passe"
        required
        error={confirm && !match ? "Les mots de passe ne correspondent pas" : null}
      >
        <TextInput
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(v) => setData({ ...data, passwordConfirm: v })}
          placeholder="Retapez votre mot de passe"
          autoComplete="new-password"
        />
      </Field>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onPrev}>
          <Icon name="arrow-left" size={16} />Retour
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!canContinue}>
          Continuer <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
};

const PinPhase = ({ data, setData, onNext, onPrev, isMobile }) => {
  const PIN_LENGTH = 6;
  const [stage, setStage] = useStateR(data.pin && data.pin.length === PIN_LENGTH ? "confirm" : "create");
  const pin = data.pin || "";
  const confirm = data.pinConfirm || "";

  const currentValue = stage === "create" ? pin : confirm;

  // Auto-advance from "create" to "confirm" once the PIN is complete.
  React.useEffect(() => {
    if (stage === "create" && pin.length === PIN_LENGTH) {
      const t = setTimeout(() => setStage("confirm"), 240);
      return () => clearTimeout(t);
    }
  }, [stage, pin]);

  // Functional updates — avoid stale-closure issues when the user taps the
  // on-screen numpad fast (multiple sync clicks within one batch).
  const setCurrentValue = (updater) => {
    setData((prev) => {
      const key = stage === "create" ? "pin" : "pinConfirm";
      const current = prev[key] || "";
      const next = typeof updater === "function" ? updater(current) : updater;
      if (next === current) return prev;
      return { ...prev, [key]: next };
    });
  };

  const handleDigit = (d) => {
    setCurrentValue((cur) => (cur.length >= PIN_LENGTH ? cur : cur + d));
  };
  const handleBackspace = () => {
    setCurrentValue((cur) => (cur.length ? cur.slice(0, -1) : cur));
  };

  const match = pin.length === PIN_LENGTH && confirm === pin;
  const mismatch = confirm.length === PIN_LENGTH && confirm !== pin;

  return (
    <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start" }}>
      <div>
        <h1>{stage === "create" ? "Choisissez un code PIN" : "Confirmez votre code PIN"}</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15, maxWidth: 480 }}>
          {stage === "create"
            ? "Un code à 6 chiffres pour accéder rapidement à votre espace. Évitez les dates de naissance ou les suites évidentes (123456, 000000…)."
            : "Saisissez à nouveau les 6 mêmes chiffres pour confirmer."}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", alignItems: "center", padding: "8px 0" }}>
        <OtpInput
          key={stage}
          value={currentValue}
          onChange={setCurrentValue}
          length={PIN_LENGTH}
          mask
          readOnly={isMobile}
          autoFocus={!isMobile}
        />

        {isMobile && (
          <NumPad onDigit={handleDigit} onBackspace={handleBackspace} />
        )}

        {stage === "confirm" && mismatch && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 13 }}>
            <Icon name="alert-triangle" size={14} />
            Les codes ne correspondent pas.{" "}
            <button
              className="btn btn-text btn-sm"
              style={{ color: "var(--danger)", padding: "2px 6px", minHeight: 0 }}
              onClick={() => {
                setData({ ...data, pin: "", pinConfirm: "" });
                setStage("create");
              }}
            >
              Recommencer
            </button>
          </div>
        )}

        {stage === "confirm" && match && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--success)", fontSize: 13 }}>
            <Icon name="check-circle" size={14} />
            Code PIN confirmé
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "10px 12px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          display: "flex",
          gap: 8,
          width: "100%",
        }}
      >
        <Icon name="shield" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Ce code reste local à votre appareil. Il ne remplace pas votre mot de passe — il sert d'accès rapide après votre première connexion.
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (stage === "confirm") {
              setData({ ...data, pinConfirm: "" });
              setStage("create");
            } else {
              onPrev();
            }
          }}
        >
          <Icon name="arrow-left" size={16} />Retour
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!match}>
          Continuer <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
};

const OtpPhase = ({ data, setData, onNext, onPrev }) => {
  const [countdown, setCountdown] = useStateR(50);
  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);
  const canContinue = (data.otp || "").replace(/\s/g, "").length === 6;
  return (
    <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Vérifions votre email</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Un code à 6 chiffres a été envoyé à <strong style={{ color: "var(--text)" }}>{data.email || "votre adresse"}</strong>.
        </p>
      </div>

      <OtpInput value={data.otp} onChange={(v) => setData({ ...data, otp: v })} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text-muted)" }}>
        <Icon name="mail" size={14} />
        {countdown > 0 ? (
          <span>Renvoyer le code dans <strong className="text-mono">{countdown}s</strong></span>
        ) : (
          <button className="btn btn-text btn-sm" onClick={() => setCountdown(50)}>
            Renvoyer le code
          </button>
        )}
        <span>•</span>
        <button className="btn btn-text btn-sm" onClick={onPrev}>
          Modifier l'email
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onPrev}>
          <Icon name="arrow-left" size={16} />Retour
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!canContinue}>
          Vérifier et continuer <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
};

const BirthPhase = ({ data, setData, onNext, onPrev }) => (
  <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div>
      <h1>Naissance et nationalité</h1>
      <p className="text-muted mt-2" style={{ fontSize: 15 }}>
        Ces informations doivent correspondre à votre acte de naissance et à votre passeport.
      </p>
    </div>
    <div className="grid-2">
      <Field label="Date de naissance" required>
        <TextInput
          type="date"
          value={data.birthDate}
          onChange={(v) => setData({ ...data, birthDate: v })}
        />
      </Field>
      <Field label="Lieu de naissance" required>
        <TextInput
          value={data.birthPlace}
          onChange={(v) => setData({ ...data, birthPlace: v })}
          placeholder="Bikélé"
        />
      </Field>
      <Field label="Pays de naissance">
        <CountrySelect value={data.birthCountry || "GA"} onChange={(v) => setData({ ...data, birthCountry: v })} />
      </Field>
      <Field label="Genre">
        <Select
          value={data.gender}
          onChange={(v) => setData({ ...data, gender: v })}
          placeholder="Sélectionner"
          options={[
            { value: "Male", label: "Homme" },
            { value: "Female", label: "Femme" },
          ]}
        />
      </Field>
      <Field label="Nationalité">
        <CountrySelect value={data.nationality || "GA"} onChange={(v) => setData({ ...data, nationality: v })} />
      </Field>
      <Field label="Acquisition de la nationalité">
        <Select
          value={data.nationalityAcquisition || "birth"}
          onChange={(v) => setData({ ...data, nationalityAcquisition: v })}
          options={[
            { value: "birth", label: "Naissance" },
            { value: "naturalization", label: "Naturalisation" },
            { value: "marriage", label: "Mariage" },
          ]}
        />
      </Field>
      <Field label="NIP (Numéro d'Identification Personnel)" hint="Optionnel — figure sur votre carte d'identité gabonaise">
        <TextInput
          value={data.nip}
          onChange={(v) => setData({ ...data, nip: v })}
          placeholder="Optionnel"
        />
      </Field>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <button className="btn btn-ghost" onClick={onPrev}>
        <Icon name="arrow-left" size={16} />Retour
      </button>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        Continuer <Icon name="arrow-right" size={16} />
      </button>
    </div>
  </div>
);

const PassportPhase = ({ data, setData, onNext, onPrev }) => (
  <div className="tf-slide" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div>
      <h1>Votre passeport</h1>
      <p className="text-muted mt-2" style={{ fontSize: 15 }}>
        Reportez les informations qui figurent sur la page d'identification de votre passeport.
      </p>
    </div>
    <div className="grid-2">
      <Field label="Numéro de passeport" required>
        <TextInput
          value={data.passportNumber}
          onChange={(v) => setData({ ...data, passportNumber: v })}
          placeholder="24PP13071"
        />
      </Field>
      <Field label="Autorité de délivrance">
        <TextInput
          value={data.passportIssuingAuthority}
          onChange={(v) => setData({ ...data, passportIssuingAuthority: v })}
          placeholder="DGDI Libreville"
        />
      </Field>
      <Field label="Délivré le">
        <TextInput
          type="date"
          value={data.passportIssueDate}
          onChange={(v) => setData({ ...data, passportIssueDate: v })}
        />
      </Field>
      <Field label="Expire le">
        <TextInput
          type="date"
          value={data.passportExpiryDate}
          onChange={(v) => setData({ ...data, passportExpiryDate: v })}
        />
      </Field>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <button className="btn btn-ghost" onClick={onPrev}>
        <Icon name="arrow-left" size={16} />Retour
      </button>
      <button className="btn btn-primary btn-lg" onClick={onNext}>
        Terminer cette étape <Icon name="arrow-right" size={16} />
      </button>
    </div>
  </div>
);

/* ---------------- Step 2: Family ---------------- */

const FamilyStep = ({ data, setData }) => {
  const showSpouse = data.maritalStatus === "Married" || data.maritalStatus === "CivilUnion";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Situation familiale</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Indiquez votre statut marital ainsi que vos parents (filiation).
        </p>
      </div>

      <Field label="Statut marital" required>
        <Select
          value={data.maritalStatus}
          onChange={(v) => setData({ ...data, maritalStatus: v })}
          placeholder="Sélectionner"
          options={[
            { value: "Single", label: "Célibataire" },
            { value: "Married", label: "Marié(e)" },
            { value: "Divorced", label: "Divorcé(e)" },
            { value: "Widowed", label: "Veuf(ve)" },
            { value: "CivilUnion", label: "Union civile (PACS)" },
            { value: "Cohabiting", label: "Concubinage" },
          ]}
        />
      </Field>

      {showSpouse && (
        <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
          <h3 style={{ marginBottom: 12 }}>Votre conjoint(e)</h3>
          <div className="grid-2">
            <Field label="Nom de famille">
              <TextInput
                value={data.spouseLastName}
                onChange={(v) => setData({ ...data, spouseLastName: v })}
              />
            </Field>
            <Field label="Prénom">
              <TextInput
                value={data.spouseFirstName}
                onChange={(v) => setData({ ...data, spouseFirstName: v })}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
        <h3 style={{ marginBottom: 12 }}>Filiation</h3>
        <div className="col">
          <div>
            <div className="text-muted text-sm" style={{ marginBottom: 6 }}>Père</div>
            <div className="grid-2">
              <Field label="Nom">
                <TextInput value={data.fatherLastName} onChange={(v) => setData({ ...data, fatherLastName: v })} />
              </Field>
              <Field label="Prénom">
                <TextInput value={data.fatherFirstName} onChange={(v) => setData({ ...data, fatherFirstName: v })} />
              </Field>
            </div>
          </div>
          <div>
            <div className="text-muted text-sm" style={{ marginBottom: 6 }}>Mère</div>
            <div className="grid-2">
              <Field label="Nom de naissance">
                <TextInput value={data.motherLastName} onChange={(v) => setData({ ...data, motherLastName: v })} />
              </Field>
              <Field label="Prénom">
                <TextInput value={data.motherFirstName} onChange={(v) => setData({ ...data, motherFirstName: v })} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Step 3: Contacts ---------------- */

const ContactsStep = ({ data, setData, profileType }) => {
  const isLong = profileType === "long_stay";
  const isForeigner = profileType === "foreigner";
  const wantsEmergency = isLong || isForeigner;
  const wantsHomeland = isLong;

  const emergency = data.emergencyContacts || [{}];
  const setEmergency = (next) => setData({ ...data, emergencyContacts: next });
  const updateEC = (i, key, val) => {
    const next = [...emergency];
    next[i] = { ...next[i], [key]: val };
    setEmergency(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Adresses et contacts</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Vos coordonnées de résidence et personnes à contacter en cas d'urgence.
        </p>
      </div>

      <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Icon name="map-pin" size={16} style={{ color: "var(--gabon-blue)" }} />
          <h3>Adresse de résidence</h3>
        </div>
        <Field label="Adresse complète">
          <TextInput
            value={data.address?.full}
            onChange={(v) => setData({ ...data, address: { ...(data.address || {}), full: v } })}
            placeholder="Commencez à taper pour des suggestions…"
          />
        </Field>
        <div className="grid-2 mt-3">
          <Field label="Ville">
            <TextInput
              value={data.address?.city}
              onChange={(v) => setData({ ...data, address: { ...(data.address || {}), city: v } })}
            />
          </Field>
          <Field label="Code postal">
            <TextInput
              value={data.address?.postalCode}
              onChange={(v) => setData({ ...data, address: { ...(data.address || {}), postalCode: v } })}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Pays">
            <CountrySelect
              value={data.address?.country || "FR"}
              onChange={(v) => setData({ ...data, address: { ...(data.address || {}), country: v } })}
            />
          </Field>
        </div>
      </div>

      {wantsHomeland && (
        <div className="card card-pad" style={{ background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="home" size={16} style={{ color: "var(--gabon-green)" }} />
            <h3>Adresse au Gabon</h3>
          </div>
          <Field label="Adresse complète" hint="Adresse de référence dans votre pays d'origine">
            <TextInput
              value={data.homeland?.full}
              onChange={(v) => setData({ ...data, homeland: { ...(data.homeland || {}), full: v } })}
              placeholder="Quartier, rue, ville"
            />
          </Field>
        </div>
      )}

      {wantsEmergency && (
        <div className="card card-pad" style={{ background: "rgba(241, 197, 49, 0.05)", borderColor: "rgba(241, 197, 49, 0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="phone" size={16} style={{ color: "var(--warning)" }} />
            <h3>Contacts d'urgence</h3>
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
            Au moins une personne à contacter, idéalement dans le pays de résidence et au Gabon.
          </p>
          <div className="col">
            {emergency.map((ec, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  borderRadius: 12,
                  padding: 16,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <strong style={{ fontSize: 13 }}>Contact n°{i + 1}</strong>
                  {emergency.length > 1 && (
                    <button
                      className="btn btn-text btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => setEmergency(emergency.filter((_, j) => j !== i))}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
                <div className="grid-2">
                  <Field label="Prénom" required>
                    <TextInput value={ec.firstName} onChange={(v) => updateEC(i, "firstName", v)} />
                  </Field>
                  <Field label="Nom" required>
                    <TextInput value={ec.lastName} onChange={(v) => updateEC(i, "lastName", v)} />
                  </Field>
                  <Field label="Téléphone" required>
                    <TextInput type="tel" value={ec.phone} onChange={(v) => updateEC(i, "phone", v)} />
                  </Field>
                  <Field label="Email">
                    <TextInput type="email" value={ec.email} onChange={(v) => updateEC(i, "email", v)} />
                  </Field>
                  <Field label="Pays du contact">
                    <CountrySelect value={ec.country || "GA"} onChange={(v) => updateEC(i, "country", v)} />
                  </Field>
                </div>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => setEmergency([...emergency, {}])}
              style={{ borderStyle: "dashed" }}
            >
              <Icon name="plus" size={16} /> Ajouter un contact d'urgence
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Step 4: Profession ---------------- */

const ProfessionStep = ({ data, setData }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div>
      <h1>Situation professionnelle</h1>
      <p className="text-muted mt-2" style={{ fontSize: 15 }}>
        Décrivez votre activité actuelle. Ces informations restent confidentielles.
      </p>
    </div>
    <Field label="Statut professionnel" required>
      <Select
        value={data.workStatus}
        onChange={(v) => setData({ ...data, workStatus: v })}
        placeholder="Sélectionner"
        options={[
          { value: "Employee", label: "Salarié(e)" },
          { value: "SelfEmployed", label: "Indépendant(e)" },
          { value: "Entrepreneur", label: "Entrepreneur(e)" },
          { value: "Student", label: "Étudiant(e)" },
          { value: "Retired", label: "Retraité(e)" },
          { value: "Unemployed", label: "Sans emploi" },
          { value: "Other", label: "Autre" },
        ]}
      />
    </Field>
    {data.workStatus && data.workStatus !== "Unemployed" && data.workStatus !== "Retired" && (
      <div className="grid-2 tf-slide">
        <Field label="Titre du poste">
          <TextInput value={data.workTitle} onChange={(v) => setData({ ...data, workTitle: v })} placeholder="ex. Développeuse" />
        </Field>
        <Field label="Employeur">
          <TextInput value={data.workEmployer} onChange={(v) => setData({ ...data, workEmployer: v })} placeholder="ex. Acme SARL" />
        </Field>
      </div>
    )}
  </div>
);

/* ---------------- Step 5: Documents ---------------- */

const DOCS_BY_TYPE = {
  long_stay: [
    { key: "identityPhoto", label: "Photo d'identité", formats: "JPG, PNG", max: "20MB", required: true, icon: "camera" },
    { key: "passport", label: "Passeport", formats: "PDF, JPG", max: "5MB", required: true, icon: "id-card", autoFilled: true },
    { key: "birthCertificate", label: "Acte de naissance", formats: "PDF, JPG", max: "5MB", required: true, icon: "file-text", autoFilled: true },
    { key: "addressProof", label: "Justificatif de domicile", formats: "PDF, JPG", max: "5MB", required: true, icon: "home", hint: "Moins de 3 mois", autoFilled: true },
    { key: "residencePermit", label: "Titre de séjour", formats: "PDF, JPG", max: "20MB", required: false, icon: "shield" },
  ],
  short_stay: [
    { key: "identityPhoto", label: "Photo d'identité", formats: "JPG, PNG", max: "20MB", required: true, icon: "camera" },
    { key: "passport", label: "Passeport", formats: "PDF, JPG", max: "5MB", required: true, icon: "id-card" },
  ],
  foreigner: [
    { key: "identityPhoto", label: "Photo d'identité", formats: "JPG, PNG", max: "20MB", required: true, icon: "camera" },
    { key: "passport", label: "Passeport", formats: "PDF, JPG", max: "5MB", required: true, icon: "id-card" },
  ],
};

const DocumentsStep = ({ data, setData, profileType, hasAIPrefill }) => {
  const docs = DOCS_BY_TYPE[profileType] || DOCS_BY_TYPE.long_stay;
  const files = data.documents || {};
  const setFile = (key, name) => setData({ ...data, documents: { ...files, [key]: name } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Pièces justificatives</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          {hasAIPrefill
            ? "Certains documents ont déjà été récupérés depuis le pré-remplissage IA."
            : "Téléversez les pièces requises pour votre dossier."}
        </p>
      </div>

      <div className="col">
        {docs.map((doc) => {
          const file = files[doc.key];
          const autoFilled = hasAIPrefill && doc.autoFilled && !file;
          return (
            <div
              key={doc.key}
              className="card"
              style={{
                padding: 16,
                borderColor: file ? "var(--success)" : autoFilled ? "var(--gabon-blue)" : "var(--border)",
                background: file ? "var(--success-tint)" : autoFilled ? "var(--gabon-blue-tint)" : "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: file ? "var(--success)" : autoFilled ? "var(--gabon-blue)" : "var(--surface-2)",
                    color: file || autoFilled ? "#fff" : "var(--text-muted)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={file ? "check" : autoFilled ? "sparkles" : doc.icon} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {doc.label}
                    {doc.required && <span style={{ color: "var(--danger)" }}>*</span>}
                    {autoFilled && (
                      <span className="pill pill-info" style={{ fontSize: 10, padding: "2px 6px" }}>
                        Pré-rempli IA
                      </span>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {file
                      ? file
                      : `${doc.formats} · max ${doc.max}${doc.hint ? " · " + doc.hint : ""}`}
                  </div>
                </div>
                {file ? (
                  <button
                    className="btn btn-text btn-sm"
                    onClick={() => {
                      const next = { ...files };
                      delete next[doc.key];
                      setData({ ...data, documents: next });
                    }}
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                ) : (
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => setFile(doc.key, `${doc.key}-${Date.now().toString(36)}.pdf`)}
                  >
                    <Icon name="upload" size={14} />
                    Téléverser
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: 12,
          background: "var(--surface-2)",
          borderRadius: 10,
          border: "1px solid var(--border)",
          display: "flex",
          gap: 10,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Vos documents sont stockés de manière chiffrée et accessibles uniquement par les agents
          consulaires habilités.
        </span>
      </div>
    </div>
  );
};

/* ---------------- Step 6: Review ---------------- */

const ReviewSection = ({ title, onEdit, children }) => (
  <div className="card" style={{ padding: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <strong style={{ fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {title}
      </strong>
      {onEdit && (
        <button className="btn btn-text btn-sm" onClick={onEdit}>
          <Icon name="edit" size={12} /> Modifier
        </button>
      )}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 14 }}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div>
    <div className="text-muted" style={{ fontSize: 12, marginBottom: 2 }}>{label}</div>
    <div style={{ fontWeight: 500 }}>{value || <span className="text-faint">—</span>}</div>
  </div>
);

const ReviewStep = ({ data, profileType, onJump, onSubmit }) => {
  const [accepted, setAccepted] = useStateR(false);
  const docs = DOCS_BY_TYPE[profileType];
  const filledDocs = docs.filter((d) => (data.documents || {})[d.key]).length;
  const totalDocs = docs.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1>Vérifiez et soumettez</h1>
        <p className="text-muted mt-2" style={{ fontSize: 15 }}>
          Relisez attentivement les informations avant de soumettre votre dossier.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px",
          background: "var(--gabon-blue-tint)",
          borderRadius: 12,
          border: "1px solid rgba(11, 79, 156, 0.15)",
        }}
      >
        <Icon name="check-circle" size={18} style={{ color: "var(--gabon-blue)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "var(--text)" }}>
          <strong>Prêt à soumettre.</strong> Votre dossier sera transmis au service consulaire pour
          validation. Vous recevrez une notification dès que votre statut changera.
        </div>
      </div>

      <ReviewSection title="Identité" onEdit={() => onJump(0)}>
        <Row label="Nom complet" value={[data.firstName, data.lastName].filter(Boolean).join(" ")} />
        <Row label="Né(e) le" value={data.birthDate} />
        <Row label="Lieu de naissance" value={data.birthPlace} />
        <Row label="Pays de naissance" value={countryByCode(data.birthCountry)?.name} />
        <Row label="Genre" value={data.gender === "Male" ? "Homme" : data.gender === "Female" ? "Femme" : null} />
        <Row label="Nationalité" value={countryByCode(data.nationality)?.name} />
        <Row label="Email" value={data.email} />
        <Row label="Téléphone" value={data.phone} />
      </ReviewSection>

      {data.passportNumber && (
        <ReviewSection title="Passeport" onEdit={() => onJump(0)}>
          <Row label="N°" value={data.passportNumber} />
          <Row label="Autorité" value={data.passportIssuingAuthority} />
          <Row label="Délivré le" value={data.passportIssueDate} />
          <Row label="Expire le" value={data.passportExpiryDate} />
        </ReviewSection>
      )}

      {profileType === "long_stay" && (
        <ReviewSection title="Famille" onEdit={() => onJump(1)}>
          <Row
            label="Statut"
            value={
              { Single: "Célibataire", Married: "Marié(e)", Divorced: "Divorcé(e)", Widowed: "Veuf(ve)", CivilUnion: "Union civile", Cohabiting: "Concubinage" }[data.maritalStatus]
            }
          />
          <Row label="Père" value={[data.fatherFirstName, data.fatherLastName].filter(Boolean).join(" ")} />
          <Row label="Mère" value={[data.motherFirstName, data.motherLastName].filter(Boolean).join(" ")} />
        </ReviewSection>
      )}

      <ReviewSection title="Adresses et contacts" onEdit={() => onJump(profileType === "long_stay" ? 2 : 1)}>
        <Row label="Adresse" value={data.address?.full} />
        <Row label="Pays" value={countryByCode(data.address?.country)?.name} />
        {profileType === "long_stay" && (
          <Row label="Adresse Gabon" value={data.homeland?.full} />
        )}
        <Row label="Contacts d'urgence" value={(data.emergencyContacts || []).filter((c) => c.firstName).length + " enregistré(s)"} />
      </ReviewSection>

      {profileType === "long_stay" && (
        <ReviewSection title="Profession" onEdit={() => onJump(3)}>
          <Row label="Statut" value={data.workStatus} />
          <Row label="Titre" value={data.workTitle} />
          <Row label="Employeur" value={data.workEmployer} />
        </ReviewSection>
      )}

      <ReviewSection title={`Documents (${filledDocs}/${totalDocs})`} onEdit={() => onJump(STEPS_BY_TYPE[profileType].length - 2)}>
        {docs.map((d) => {
          const name = (data.documents || {})[d.key];
          return (
            <div key={d.key} style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon
                name={name ? "check-circle" : d.required ? "alert-triangle" : "file-text"}
                size={14}
                style={{ color: name ? "var(--success)" : d.required ? "var(--warning)" : "var(--text-muted)" }}
              />
              <span style={{ fontSize: 13 }}>{d.label}</span>
              {d.required && !name && (
                <span className="pill pill-warning" style={{ fontSize: 10, padding: "1px 6px" }}>
                  Requis
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                {name || "Non fourni"}
              </span>
            </div>
          );
        })}
      </ReviewSection>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 14,
          padding: "12px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ marginTop: 3, accentColor: "var(--gabon-blue)" }}
        />
        <span>
          Je certifie sur l'honneur l'exactitude des informations fournies et j'accepte les
          conditions générales d'utilisation.
        </span>
      </label>

      <button
        className="btn btn-primary btn-lg btn-block"
        disabled={!accepted}
        onClick={onSubmit}
      >
        Soumettre mon dossier <Icon name="arrow-right" size={18} />
      </button>
    </div>
  );
};

/* ---------------- Submitted screen ---------------- */

const SubmittedScreen = ({ profileType, onRestart, isMobile }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 18,
      padding: isMobile ? "48px 24px" : "64px 32px",
      textAlign: "center",
      maxWidth: 460,
      margin: "0 auto",
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--success-tint)",
        color: "var(--success)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Icon name="check" size={36} stroke={2.5} />
    </div>
    <div>
      <h1>Dossier soumis</h1>
      <p className="text-muted mt-2" style={{ fontSize: 15 }}>
        Votre dossier a été transmis au service consulaire. Vous recevrez une notification par
        email dès qu'il sera traité.
      </p>
    </div>
    <div
      className="card card-pad"
      style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div className="text-muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Référence du dossier
      </div>
      <div className="text-mono" style={{ fontSize: 22, fontWeight: 600 }}>
        GA-2026-{Math.random().toString(36).substr(2, 6).toUpperCase()}
      </div>
      <div className="text-muted text-sm">
        Conservez cette référence pour suivre l'avancement de votre demande dans votre espace personnel.
      </div>
    </div>
    <div style={{ display: "flex", gap: 10, width: "100%" }}>
      <button className="btn btn-ghost flex-1" onClick={onRestart}>
        Nouvelle demande
      </button>
      <button className="btn btn-primary flex-1">
        Mon espace <Icon name="arrow-right" size={16} />
      </button>
    </div>
  </div>
);

/* ---------------- Expose ---------------- */

Object.assign(window, {
  STEPS_BY_TYPE,
  PROFILE_TITLES,
  IdentityStep,
  FamilyStep,
  ContactsStep,
  ProfessionStep,
  DocumentsStep,
  ReviewStep,
  SubmittedScreen,
  DOCS_BY_TYPE,
});
