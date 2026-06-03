// Atlas — App shell
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "balanced"
}/*EDITMODE-END*/;

const ASCREENS = {
  dashboard:   { title: "Today",       sub: "A measured view of your portfolio.",       em: "Today",        Comp: window.AtlasDashboard },
  properties:  { title: "Properties",  sub: "Four addresses · six doors.",              em: "Properties",   Comp: window.AtlasProperties },
  tenancies:   { title: "Tenancies",   sub: "Agreements and renewal windows.",          em: "Tenancies",    Comp: window.AtlasTenancies },
  tenants:     { title: "Tenants",     sub: "People living in your units.",             em: "Tenants",      Comp: window.AtlasTenants },
  ledger:      { title: "Rent ledger", sub: "Cash in, cash out.",                       em: "Rent ledger",  Comp: window.AtlasRentLedger },
  compliance:  { title: "Compliance",  sub: "Certificates, licenses, safety checks.",   em: "Compliance",   Comp: window.AtlasCompliance },
  maintenance: { title: "Maintenance", sub: "Open jobs across your portfolio.",         em: "Maintenance",  Comp: window.AtlasMaintenance },
  team:        { title: "Team",        sub: "People with access to this org.",          em: "Team",         Comp: window.AtlasTeam },
  settings:    { title: "Settings",    sub: "Org details, integrations, notifications.",em: "Settings",     Comp: window.AtlasSettings },
};

function AtlasApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("dashboard");
  const sc = ASCREENS[screen];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.theme]);

  return (
    <div className={"app density-" + t.density} data-screen-label={"01 " + sc.title}>
      <div className="grain" />
      <AtlasSidebar screen={screen} setScreen={setScreen} />
      <main className="main">
        <AtlasTopbar title={sc.title} em={sc.em} sub={sc.sub} theme={t.theme} setTheme={(th) => setTweak("theme", th)} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <sc.Comp goto={setScreen} />
        </div>
      </main>
      <AtlasTweaks t={t} setTweak={setTweak} />
    </div>
  );
}

function AtlasSidebar({ screen, setScreen }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div className="brand-name">PropFlow</div>
      </div>
      <div className="org">
        <div className="org-name">{window.PROPFLOW_DATA.org.name}</div>
        <div className="org-plan">{window.PROPFLOW_DATA.org.plan}</div>
      </div>

      {window.PROPFLOW_DATA.nav.map((section) => (
        <div key={section.section} className="nav-section">
          <div className="nav-heading">{section.section.charAt(0) + section.section.slice(1).toLowerCase()}</div>
          {section.items.map((item) => (
            <div key={item.id}
                 className={"nav-item" + (screen === item.id ? " active" : "")}
                 onClick={() => setScreen(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span>{item.label}</span>
              {item.id === "compliance" && <span className="nav-badge" style={{color:"var(--rose)", background:"rgba(217,110,96,.12)", borderColor:"rgba(217,110,96,.3)"}}>1</span>}
              {item.id === "tenancies"  && <span className="nav-badge">5</span>}
            </div>
          ))}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12,
        border: "1px solid var(--border)", background: "var(--surface)",
      }}>
        <div className="avatar">AM</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Newsreader, serif", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Alex Mehnain</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Owner</div>
        </div>
        <span style={{ color: "var(--text-mute)" }}><Icon name="chev" size={14} /></span>
      </div>
    </aside>
  );
}

function AtlasTopbar({ title, em, sub, theme, setTheme }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1><em>{em}.</em></h1>
        <p>{sub}</p>
      </div>
      <div className="topbar-spacer" />
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder="Search properties, tenants…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
        <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
      </button>
      <button className="icon-btn" title="Notifications">
        <Icon name="bell" size={16} />
        <span className="dot" />
      </button>
    </header>
  );
}

function AtlasTweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks · Atlas">
      <TweakSection title="Appearance">
        <TweakRadio label="Theme"   value={t.theme}   onChange={(v) => setTweak("theme", v)}   options={[{value:"dark",label:"Dark"},{value:"light",label:"Light"}]} />
        <TweakRadio label="Density" value={t.density} onChange={(v) => setTweak("density", v)} options={[{value:"roomy",label:"Roomy"},{value:"balanced",label:"Balanced"},{value:"dense",label:"Dense"}]} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AtlasApp />);
