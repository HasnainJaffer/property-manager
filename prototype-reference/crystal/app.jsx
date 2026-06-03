// Crystal — App shell
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "balanced",
  "accent": "indigo"
}/*EDITMODE-END*/;

const SCREENS = {
  dashboard:   { title: "Dashboard",   sub: "Here's your portfolio at a glance",     Comp: window.Dashboard },
  properties:  { title: "Properties",  sub: "All 4 properties in your portfolio",     Comp: window.Properties },
  tenancies:   { title: "Tenancies",   sub: "Agreements and renewal windows",         Comp: window.Tenancies },
  tenants:     { title: "Tenants",     sub: "People living in your units",            Comp: window.Tenants },
  ledger:      { title: "Rent ledger", sub: "Cash in, cash out",                       Comp: window.RentLedger },
  compliance:  { title: "Compliance",  sub: "Certificates, licenses, safety checks",  Comp: window.Compliance },
  maintenance: { title: "Maintenance", sub: "Open jobs across your portfolio",        Comp: window.Maintenance },
  team:        { title: "Team",        sub: "People with access to this org",         Comp: window.Team },
  settings:    { title: "Settings",    sub: "Org details, integrations, notifications",Comp: window.Settings },
};

function CrystalApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("dashboard");
  const sc = SCREENS[screen];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.theme]);

  return (
    <div className={"app density-" + t.density} data-screen-label={"01 " + sc.title}>
      <Sidebar screen={screen} setScreen={setScreen} />

      <main className="main">
        <Topbar title={sc.title} sub={sc.sub} theme={t.theme} setTheme={(th) => setTweak("theme", th)} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <sc.Comp goto={setScreen} />
        </div>
      </main>

      <CrystalTweaks t={t} setTweak={setTweak} />
    </div>
  );
}

function Sidebar({ screen, setScreen }) {
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
          <div className="nav-heading">{section.section}</div>
          {section.items.map((item) => (
            <div key={item.id}
                 className={"nav-item" + (screen === item.id ? " active" : "")}
                 onClick={() => setScreen(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span>{item.label}</span>
              {item.id === "compliance" && <span className="nav-badge" style={{color:"var(--rose)", background:"rgba(251,113,133,.12)"}}>1</span>}
              {item.id === "tenancies"  && <span className="nav-badge">5</span>}
            </div>
          ))}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 10,
        border: "1px solid var(--border)", background: "var(--surface)",
      }}>
        <div className="avatar">AM</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Alex Mehnain</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>Owner</div>
        </div>
        <span style={{ color: "var(--text-mute)" }}><Icon name="chev" size={14} /></span>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, theme, setTheme }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
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

function CrystalTweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks · Crystal">
      <TweakSection title="Appearance">
        <TweakRadio  label="Theme"   value={t.theme}   onChange={(v) => setTweak("theme", v)}   options={[{value:"dark",label:"Dark"},{value:"light",label:"Light"}]} />
        <TweakRadio  label="Density" value={t.density} onChange={(v) => setTweak("density", v)} options={[{value:"roomy",label:"Roomy"},{value:"balanced",label:"Balanced"},{value:"dense",label:"Dense"}]} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CrystalApp />);
