/* Consulat.ga — header & footer injection.
   Each page sets <body data-page="..."> to highlight the right nav link. */

(function () {
  const page = document.body.dataset.page || "";

  const NAV = [
    { id: "accueil",  label: "Accueil",        href: "Inscription Consulaire.html" },
    { id: "reseau",   label: "Réseau Mondial", href: "Réseau Mondial.html" },
    { id: "actus",    label: "Actualités",     href: "Actualités.html" },
    { id: "ressources", label: "Ressources",   href: "Ressources.html" },
    { id: "services", label: "Services",       href: "Services Consulaires.html", caret: true },
  ];

  const navHtml = NAV.map(n => `
    <a href="${n.href}" class="${n.id === page ? "active" : ""}">
      ${n.label}
      ${n.caret ? `<svg class="ic ic-14" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>` : ""}
    </a>`).join("");

  const header = `
  <header class="site-header" data-comment-anchor="site-header">
    <div class="site-header-inner">
      <a href="Inscription Consulaire.html" class="logo">
        <div class="logo-mark">G</div>
        <div class="logo-text">
          <strong>Consulat.ga</strong>
          <small>République Gabonaise</small>
        </div>
      </a>
      <nav class="site-nav">${navHtml}</nav>
      <div class="header-right">
        <button class="btn btn-text btn-sm" aria-label="Langue">
          <span style="display:inline-flex;width:18px;height:13px;border-radius:2px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.08);">
            <span style="flex:1;background:#002654"></span>
            <span style="flex:1;background:#fff"></span>
            <span style="flex:1;background:#ed2939"></span>
          </span>
          FR
          <svg class="ic ic-14" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <a href="Inscription Consulaire.html" class="btn btn-ghost btn-sm">
          <svg class="ic ic-16" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Se connecter
        </a>
      </div>
    </div>
  </header>`;

  const footer = `
  <footer class="site-footer" data-comment-anchor="site-footer">
    <div class="site-footer-inner">
      <div>
        <a href="Inscription Consulaire.html" class="logo">
          <div class="logo-mark">G</div>
          <div class="logo-text">
            <strong>Consulat.ga</strong>
            <small>République Gabonaise</small>
          </div>
        </a>
        <p style="margin-top:20px;max-width:340px;font-size:14px;line-height:1.55;">
          Plateforme officielle des services consulaires de la République Gabonaise — 46 représentations à travers le monde.
        </p>
        <div style="display:flex;height:3px;width:56px;border-radius:100px;overflow:hidden;margin-top:20px;">
          <span style="flex:1;background:#0a8a3b"></span>
          <span style="flex:1;background:#f1c531"></span>
          <span style="flex:1;background:#0b4f9c"></span>
        </div>
      </div>
      <div>
        <h4>Services</h4>
        <ul>
          <li><a href="Services Consulaires.html">Catalogue</a></li>
          <li><a href="Services Consulaires.html">Passeports &amp; visas</a></li>
          <li><a href="Services Consulaires.html">État civil</a></li>
          <li><a href="Inscription Consulaires.html">Inscription consulaire</a></li>
        </ul>
      </div>
      <div>
        <h4>Ressources</h4>
        <ul>
          <li><a href="Actualités.html">Actualités</a></li>
          <li><a href="Ressources.html">Guides &amp; tutoriels</a></li>
          <li><a href="Ressources.html">Foire aux questions</a></li>
          <li><a href="Réseau Mondial.html">Représentations</a></li>
        </ul>
      </div>
      <div>
        <h4>À propos</h4>
        <ul>
          <li><a href="#">Ministère des Affaires étrangères</a></li>
          <li><a href="#">Mentions légales</a></li>
          <li><a href="#">Confidentialité</a></li>
          <li><a href="#">Accessibilité</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} République Gabonaise — Direction Générale de la Documentation et de l'Immigration</span>
      <span>v3.0 · libreville</span>
    </div>
  </footer>`;

  const headerSlot = document.getElementById("site-header-slot");
  const footerSlot = document.getElementById("site-footer-slot");
  if (headerSlot) headerSlot.outerHTML = header;
  if (footerSlot) footerSlot.outerHTML = footer;
})();
