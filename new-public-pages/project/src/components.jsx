/* Shared UI primitives, Icons, AI Prefill flow, Site chrome */

const { useState, useEffect, useRef, useMemo } = React;

/* ---------------- Icons (inline SVG, lucide-style) ---------------- */

const Icon = ({ name, size = 18, stroke = 2, className = "", style = {} }) => {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
};

const ICONS = {
  "arrow-right": <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  "arrow-left": <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  "check-circle": (
    <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>
  ),
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  sparkles: (
    <>
      <path d="M9.5 3.5 11 7l3.5 1.5L11 10l-1.5 3.5L8 10l-3.5-1.5L8 7Z" />
      <path d="M18 13v4" />
      <path d="M16 15h4" />
      <path d="M18 3v2" />
      <path d="M17 4h2" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8 12 3 7 8" />
      <path d="M12 3v12" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  briefcase: (
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </>
  ),
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />,
  eye: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  "alert-triangle": (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  loader: (
    <>
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </>
  ),
  home: <><path d="M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  menu: <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>,
  "log-in": <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
  scan: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </>
  ),
  "id-card": (
    <>
      <path d="M16 10h2" />
      <path d="M16 14h2" />
      <path d="M6.17 15a3 3 0 0 1 5.66 0" />
      <circle cx="9" cy="11" r="2" />
      <rect x="2" y="5" width="20" height="14" rx="2" />
    </>
  ),
};

/* ---------------- Country data (mini set + flag emoji) ---------------- */

const COUNTRIES = [
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
];
const countryByCode = (code) => COUNTRIES.find((c) => c.code === code);

/* ---------------- Logo + chrome ---------------- */

const Logo = ({ compact = false }) => (
  <div className="logo">
    <div className="logo-mark">G</div>
    {!compact && (
      <div className="logo-text">
        <strong>Consulat.ga</strong>
        <small>République Gabonaise</small>
      </div>
    )}
  </div>
);

const SiteHeader = ({ minimal = false }) => (
  <header className="site-header">
    <Logo />
    {!minimal && (
      <>
        <nav className="site-header-nav">
          <a href="#">
            Services <Icon name="chevron-down" size={14} />
          </a>
          <a href="#">Réseau Mondial</a>
          <a href="#">Actualités</a>
          <a href="#">Ressources</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-text btn-sm">
            🇫🇷 FR <Icon name="chevron-down" size={14} />
          </button>
          <button className="btn btn-ghost btn-sm">
            <Icon name="log-in" size={16} />
            Se connecter
          </button>
        </div>
      </>
    )}
    {minimal && (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="pill pill-success">
          <Icon name="check" size={12} /> Brouillon sauvegardé · 11:32
        </span>
        <button className="btn btn-text btn-sm">
          🇫🇷 FR <Icon name="chevron-down" size={14} />
        </button>
      </div>
    )}
  </header>
);

const SiteFooter = () => (
  <footer
    style={{
      borderTop: "1px solid var(--border)",
      padding: "32px 32px 24px",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 32,
      background: "var(--bg)",
      color: "var(--text-muted)",
      fontSize: 13,
    }}
  >
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="shield" size={16} style={{ color: "var(--gabon-blue)" }} />
        <strong style={{ color: "var(--text)" }}>Consulat.ga</strong>
      </div>
      <p style={{ maxWidth: 320 }}>
        Plateforme officielle des services consulaires de la République Gabonaise à travers le monde.
      </p>
      <div className="gabon-stripe mt-3" />
    </div>
    {[
      ["Services", ["Catalogue des services", "Tarifs", "Formulaires à télécharger"]],
      ["Ressources", ["Actualités", "Guides et tutoriels", "Foire aux questions"]],
      ["À propos", ["Mentions légales", "Politique de confidentialité", "Accessibilité"]],
    ].map(([title, links]) => (
      <div key={title}>
        <strong style={{ color: "var(--text)", display: "block", marginBottom: 12 }}>
          {title}
        </strong>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((l) => (
            <li key={l}>
              <a href="#" style={{ textDecoration: "none", color: "inherit" }}>
                {l}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </footer>
);

/* ---------------- Mobile header (minimal chrome) ---------------- */

const MobileHeader = ({ onBack, savedAt, showLogo = false }) => (
  <div className="mobile-header">
    {onBack ? (
      <button className="icon-btn" onClick={onBack} aria-label="Retour">
        <Icon name="arrow-left" size={20} />
      </button>
    ) : (
      <div style={{ width: 36 }} />
    )}
    {showLogo ? (
      <Logo compact />
    ) : (
      savedAt && (
        <span className="pill pill-success" style={{ fontSize: 11, padding: "3px 8px" }}>
          <Icon name="check" size={11} />
          Brouillon · {savedAt}
        </span>
      )
    )}
    <button className="icon-btn" aria-label="Aide">
      <Icon name="info" size={20} />
    </button>
  </div>
);

/* ---------------- Status bar (fake mobile) ---------------- */

const StatusBar = () => (
  <div className="status-bar">
    <span>9:41</span>
    <div className="status-bar-right" style={{ fontSize: 12 }}>
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
        <rect x="0" y="6" width="3" height="5" rx="0.5" />
        <rect x="4.5" y="4" width="3" height="7" rx="0.5" />
        <rect x="9" y="2" width="3" height="9" rx="0.5" />
        <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
      </svg>
      <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M1 4.5C3 2.5 5.5 1 7.5 1S12 2.5 14 4.5" />
        <path d="M3 6.5C4.5 5 6 4.2 7.5 4.2S10.5 5 12 6.5" />
        <circle cx="7.5" cy="9" r="1" fill="currentColor" />
      </svg>
      <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="0.5" y="0.5" width="22" height="11" rx="3" />
        <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
        <rect x="23" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" />
      </svg>
    </div>
  </div>
);

/* ---------------- Field / Input wrappers ---------------- */

const Field = ({ label, required, hint, error, children }) => (
  <div className="field">
    {label && (
      <label className="field-label">
        {label} {required && <span className="req">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <span className="field-hint">{hint}</span>}
    {error && (
      <span className="field-error">
        <Icon name="alert-triangle" size={12} /> {error}
      </span>
    )}
  </div>
);

const TextInput = ({ value, onChange, type = "text", ...rest }) => (
  <input
    className="input"
    type={type}
    value={value || ""}
    onChange={(e) => onChange && onChange(e.target.value)}
    {...rest}
  />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <div className="select-wrap">
    <select
      className="select"
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  </div>
);

const CountrySelect = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={onChange}
    placeholder="Sélectionner un pays"
    options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` }))}
  />
);

/* ---------------- OTP input ---------------- */

const OtpInput = ({ value, onChange, length = 6, autoFocus = true, mask = false, readOnly = false }) => {
  const refs = useRef([]);
  const v = (value || "").padEnd(length, " ").split("").slice(0, length);

  useEffect(() => {
    if (autoFocus && !readOnly && refs.current[0]) refs.current[0].focus();
  }, [autoFocus, readOnly]);

  const setChar = (i, char) => {
    const arr = (value || "").padEnd(length, " ").split("");
    arr[i] = char || " ";
    const next = arr.join("").trimEnd();
    onChange && onChange(next);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className={`otp-grid len-${length}`}>
      {v.map((char, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={`otp-cell ${char.trim() ? "filled" : ""}`}
          inputMode={readOnly ? "none" : "numeric"}
          pattern="[0-9]*"
          maxLength={1}
          type={mask && char.trim() ? "password" : "text"}
          value={char.trim()}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            setChar(i, c);
          }}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === "Backspace" && !v[i].trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

/* ---------------- NumPad (on-screen number keypad) ---------------- */

const NumPad = ({ onDigit, onBackspace }) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, "0", "back"];
  return (
    <div className="numpad" role="group" aria-label="Pavé numérique">
      {keys.map((k, i) => {
        if (k === null) {
          return <div key={i} className="numpad-key placeholder" aria-hidden="true" />;
        }
        if (k === "back") {
          return (
            <button
              key={i}
              type="button"
              className="numpad-key action"
              onClick={onBackspace}
              aria-label="Effacer le dernier chiffre"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 5H8.5a2 2 0 0 0-1.5.7L2 12l5 6.3a2 2 0 0 0 1.5.7H21a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
                <path d="m18 9-6 6" />
                <path d="m12 9 6 6" />
              </svg>
            </button>
          );
        }
        return (
          <button
            key={i}
            type="button"
            className="numpad-key"
            onClick={() => onDigit(k)}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
};

/* ---------------- AI Prefill modal/drawer content ---------------- */

const AI_DOCS = [
  { key: "passport", label: "Passeport", hint: "Page d'identification", icon: "id-card" },
  { key: "addressProof", label: "Justificatif de domicile", hint: "Facture, quittance…", icon: "home" },
  { key: "birthCertificate", label: "Acte de naissance", hint: "Document officiel", icon: "file-text" },
];

const AIPrefillContent = ({ onClose, onComplete, isMobile }) => {
  const [stage, setStage] = useState("upload"); // upload | analyzing | done
  const [files, setFiles] = useState({});
  const filledCount = Object.keys(files).length;

  const handleSelect = (key) => {
    const name = {
      passport: "passport-scan.pdf",
      addressProof: "facture-2024.pdf",
      birthCertificate: "acte-naissance.jpg",
    }[key];
    setFiles((f) => ({ ...f, [key]: name }));
  };

  const analyze = () => {
    setStage("analyzing");
    setTimeout(() => setStage("done"), 1900);
  };

  if (stage === "analyzing") {
    return (
      <div style={{ padding: "40px 28px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ position: "relative", width: 96, height: 96 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "3px solid var(--gabon-blue-tint)",
              borderTopColor: "var(--gabon-blue)",
              borderRadius: "50%",
              animation: "spin 900ms linear infinite",
            }}
          />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--gabon-blue)" }}>
            <Icon name="sparkles" size={32} />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <div>
          <h2>Analyse en cours…</h2>
          <p className="text-muted mt-2" style={{ fontSize: 14 }}>
            Nous extrayons les informations de vos documents pour pré-remplir le formulaire.
          </p>
        </div>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(files).map(([k, name]) => {
            const doc = AI_DOCS.find((d) => d.key === k);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <Icon name="scan" size={16} style={{ color: "var(--gabon-blue)" }} />
                <span style={{ fontSize: 13, flex: 1, textAlign: "left" }}>{doc?.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (stage === "done") {
    const filled = [
      ["Prénom", "Berny"],
      ["Nom", "Itoutou"],
      ["Date de naissance", "02/02/1998"],
      ["Lieu de naissance", "Bikélé, GA"],
      ["N° passeport", "24PP13071"],
      ["Délivré le", "10/06/2024"],
      ["Expire le", "09/06/2029"],
      ["Adresse", "90 Av. des Grésillons, 92600"],
    ];
    return (
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--success-tint)",
              color: "var(--success)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="check" size={22} />
          </div>
          <div>
            <h3>Pré-remplissage réussi</h3>
            <p className="text-muted text-sm mt-2">
              {filled.length} champs ont été remplis automatiquement.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filled.map(([label, val], i) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr",
                padding: "10px 16px",
                fontSize: 13,
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span className="text-muted">{label}</span>
              <span style={{ fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>

        <p className="text-muted text-sm">
          Vous pourrez vérifier et modifier ces informations dans les prochaines étapes.
        </p>

        <button className="btn btn-primary btn-block btn-lg" onClick={() => onComplete && onComplete()}>
          Continuer le formulaire
          <Icon name="arrow-right" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "var(--gabon-blue-tint)",
              color: "var(--gabon-blue)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="sparkles" size={16} />
          </div>
          <h2 style={{ fontSize: 20 }}>Pré-remplir avec mes documents</h2>
        </div>
        <p className="text-muted text-sm">
          Téléversez ces documents et l'IA remplira automatiquement vos informations d'identité,
          de passeport et d'adresse. Tous les champs resteront modifiables.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {AI_DOCS.map((doc) => {
          const file = files[doc.key];
          return (
            <button
              key={doc.key}
              onClick={() => handleSelect(doc.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: file ? "var(--success-tint)" : "var(--surface)",
                border: `1px ${file ? "solid var(--success)" : "dashed var(--border-strong)"}`,
                borderRadius: 12,
                textAlign: "left",
                cursor: "pointer",
                color: "var(--text)",
                fontFamily: "inherit",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: file ? "var(--success)" : "var(--surface-2)",
                  color: file ? "#fff" : "var(--text-muted)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={file ? "check" : doc.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{doc.label}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {file ? file : doc.hint}
                </div>
              </div>
              <Icon name={file ? "x" : "upload"} size={16} style={{ color: "var(--text-muted)" }} />
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          background: "var(--surface-2)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          display: "flex",
          gap: 8,
        }}
      >
        <Icon name="shield" size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }} />
        <span>
          Vos documents sont chiffrés et utilisés uniquement pour le pré-remplissage. Aucune copie
          n'est conservée par l'IA.
        </span>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost flex-1" onClick={onClose}>
          Plus tard
        </button>
        <button
          className="btn btn-primary flex-1"
          disabled={filledCount === 0}
          onClick={analyze}
        >
          <Icon name="sparkles" size={16} />
          Analyser ({filledCount}/3)
        </button>
      </div>
    </div>
  );
};

const AIPrefillSheet = ({ open, onClose, onComplete, isMobile }) => {
  if (!open) return null;
  if (isMobile) {
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ overflow: "auto", flex: 1 }}>
            <AIPrefillContent onClose={onClose} onComplete={onComplete} isMobile />
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <AIPrefillContent onClose={onClose} onComplete={onComplete} />
      </div>
    </div>
  );
};

/* ---------------- Profile selector cards ---------------- */

const PROFILE_TYPES = [
  {
    code: "long_stay",
    title: "Résident à l'étranger",
    subtitle: "Gabonais résidant à l'étranger depuis plus de 6 mois",
    icon: "user",
    accent: "blue",
    benefits: ["Inscription consulaire complète", "Renouvellement de passeport", "Actes d'état civil", "Carte consulaire"],
  },
  {
    code: "short_stay",
    title: "De passage",
    subtitle: "Gabonais de passage à l'étranger (moins de 6 mois)",
    icon: "plane",
    accent: "yellow",
    benefits: ["Déclaration de passage", "Assistance consulaire", "Laissez-passer d'urgence"],
  },
  {
    code: "foreigner",
    title: "Usager étranger",
    subtitle: "Demandes de visa et services administratifs",
    icon: "globe",
    accent: "green",
    benefits: ["Demandes de visa", "Légalisation de documents", "Certificats spécifiques", "Assistance administrative"],
  },
];

const ProfileCard = ({ profile, onSelect, recommended }) => {
  const accentVar =
    profile.accent === "blue" ? "var(--gabon-blue)" :
    profile.accent === "yellow" ? "var(--gabon-yellow)" :
    "var(--gabon-green)";
  const accentTint =
    profile.accent === "blue" ? "var(--gabon-blue-tint)" :
    profile.accent === "yellow" ? "var(--gabon-yellow-tint)" :
    "var(--gabon-green-tint)";

  return (
    <div
      className="card"
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        borderColor: recommended ? accentVar : "var(--border)",
        boxShadow: recommended ? "0 0 0 3px " + accentTint : "var(--shadow-sm)",
      }}
    >
      {recommended && (
        <span className="pill pill-info" style={{ position: "absolute", top: 14, right: 14 }}>
          Recommandé pour vous
        </span>
      )}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: accentTint,
          color: accentVar,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name={profile.icon} size={22} />
      </div>
      <div>
        <h3>{profile.title}</h3>
        <p className="text-muted text-sm mt-2">{profile.subtitle}</p>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {profile.benefits.map((b) => (
          <li key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
            <Icon name="check" size={14} style={{ color: accentVar, flexShrink: 0 }} /> {b}
          </li>
        ))}
      </ul>
      <button
        className={recommended ? "btn btn-primary" : "btn btn-ghost"}
        onClick={() => onSelect(profile.code)}
        style={{ marginTop: 4 }}
      >
        Commencer l'inscription
        <Icon name="arrow-right" size={16} />
      </button>
    </div>
  );
};

/* ---------------- Stepper (desktop) ---------------- */

const Stepper = ({ steps, current, onJump }) => (
  <div className="stepper">
    {steps.map((s, i) => {
      const done = i < current;
      const cur = i === current;
      return (
        <React.Fragment key={s.key}>
          <div
            className={`stepper-item ${done ? "done" : ""} ${cur ? "current" : ""}`}
            onClick={() => onJump && (done || cur) && onJump(i)}
            style={{ cursor: done || cur ? "pointer" : "default" }}
          >
            <span className="stepper-dot">
              {done ? <Icon name="check" size={13} stroke={3} /> : i + 1}
            </span>
            <span className="stepper-label">{s.label}</span>
          </div>
          {i < steps.length - 1 && <span className={`stepper-bar ${done ? "done" : ""}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

/* ---------------- AI invite variants ---------------- */

const AIInvite = ({ variant, onClick, isMobile }) => {
  // variant: "banner" | "sticky" | "hero"
  if (variant === "hero") {
    return (
      <div className="ai-hero">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--gabon-blue)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="sparkles" size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3>Pré-remplissage par IA</h3>
            <p className="text-muted text-sm mt-2" style={{ maxWidth: 460 }}>
              Téléversez votre passeport, justificatif de domicile et acte de naissance pour remplir
              automatiquement la majorité du formulaire. <strong>Gain de temps moyen : 8 minutes.</strong>
            </p>
            <button className="btn btn-primary btn-sm mt-3" onClick={onClick}>
              <Icon name="sparkles" size={14} />
              Commencer le pré-remplissage
            </button>
          </div>
          {!isMobile && (
            <span className="pill" style={{ background: "var(--surface-2)" }}>
              Optionnel
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "sticky") {
    return (
      <div className="ai-sticky">
        <button
          onClick={onClick}
          className="btn btn-soft"
          style={{
            width: "100%",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--surface)",
            borderColor: "var(--gabon-blue)",
            color: "var(--gabon-blue)",
            boxShadow: "0 4px 14px -6px rgba(11,79,156,0.2)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="sparkles" size={16} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <strong style={{ fontSize: 14 }}>Pré-remplir avec mes documents</strong>
              <span className="text-muted" style={{ fontSize: 12, fontWeight: 400 }}>
                Économisez ~8 minutes
              </span>
            </span>
          </span>
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    );
  }

  // banner (default)
  return (
    <div className="ai-banner">
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--gabon-blue)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="sparkles" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Gagnez du temps avec l'IA</div>
        <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
          Pré-remplissez le formulaire à partir de vos documents
        </div>
      </div>
      <button className="btn btn-text btn-sm" onClick={onClick} style={{ color: "var(--gabon-blue)" }}>
        Essayer
        <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
};

/* ---------------- Expose to global ---------------- */

Object.assign(window, {
  Icon,
  COUNTRIES,
  countryByCode,
  Logo,
  SiteHeader,
  SiteFooter,
  MobileHeader,
  StatusBar,
  Field,
  TextInput,
  Select,
  CountrySelect,
  OtpInput,
  NumPad,
  AIPrefillSheet,
  PROFILE_TYPES,
  ProfileCard,
  Stepper,
  AIInvite,
});
