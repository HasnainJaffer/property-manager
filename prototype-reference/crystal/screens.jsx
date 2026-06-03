// Crystal — screen components
const { useState, useMemo } = React;
const D = window.PROPFLOW_DATA;

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ goto }) {
  const k = D.kpis;
  return (
    <div className="stack">
      <div className="banner" role="status">
        <span className="b-icon"><Icon name="warn" size={18} /></span>
        <div className="b-text">
          <strong>1 compliance certificate has expired</strong>
          <span style={{ color: "var(--text-dim)" }}> — gas safety at 24 Thornton Road is overdue for renewal.</span>
        </div>
        <a className="b-action" onClick={() => goto("compliance")}>View<Icon name="arrow" size={14} /></a>
      </div>

      {/* KPI strip */}
      <div className="kpis">
        <KpiCard data={k.rentRoll}  accent="rent"     delta={{ kind: "up",   text: "+£200 vs Apr" }} sparkColor="var(--cyan)" />
        <KpiCard data={k.arrears}   accent="arrears"  delta={{ kind: "down", text: "+£1.6k WoW" }}  sparkColor="var(--rose)" valueFmt="gbp" />
        <KpiCard data={k.occupancy} accent="occ"      delta={{ kind: "down", text: "−20% MoM" }}    sparkColor="var(--mint)" valueFmt="pct" />
        <KpiCard data={k.expiring}  accent="exp"      delta={{ kind: "flat", text: "Stable" }}      sparkColor="var(--amber)" />
      </div>

      {/* Portfolio overview hero */}
      <PortfolioHero goto={goto} />

      <div className="row-grid">
        <RentCollectionCard />
        <div className="stack">
          <ComplianceCard goto={goto} />
          <RenewalsCard goto={goto} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ data, accent, sparkColor, delta, valueFmt }) {
  const fmt = (v) =>
    valueFmt === "gbp" ? fmtGBP(v) :
    valueFmt === "pct" ? v + "%" :
    accent === "rent" ? fmtGBP(v) : v;
  return (
    <div className="card kpi">
      <div className="label">{data.label}</div>
      <div className="row">
        <div className={"value accent-" + accent}>{fmt(data.value)}</div>
        <Sparkline values={data.spark} width={84} height={28} color={sparkColor}
                   fill={`color-mix(in oklab, ${sparkColor} 18%, transparent)`} />
      </div>
      <div className="sub">
        {delta && <span className={"delta " + delta.kind}>{delta.text}</span>}
        <span>{data.sub}</span>
      </div>
    </div>
  );
}

function PortfolioHero({ goto }) {
  const totalUnits = D.properties.reduce((a, p) => a + p.units, 0);
  const occupied = D.properties.reduce((a, p) => a + p.occupied, 0);
  const occPct = Math.round((occupied / totalUnits) * 100);
  const monthlyTotal = D.properties.reduce((a, p) => a + p.monthly, 0);

  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <div className="section-eyebrow">Portfolio</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {D.properties.length} properties · {totalUnits} units
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><Icon name="filter" size={14} />Filter</button>
          <button className="btn"><Icon name="plus" size={14} />Add property</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, marginTop: 14, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: "var(--mint)" }}>
            <Donut value={occPct} size={86} thickness={8} color="currentColor" track="var(--surface-3)" label={occPct + "%"} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Stat k="Occupancy" v={`${occupied}/${totalUnits}`} sub="units let" />
            <Stat k="Gross monthly" v={fmtGBP(monthlyTotal)} sub="across portfolio" />
          </div>
        </div>

        {/* Property mini list */}
        <div style={{ display: "grid", gap: 8 }}>
          {D.properties.map((p) => <PropertyRow key={p.id} p={p} onClick={() => goto("properties")} />)}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div>
      <div className="section-eyebrow">{k}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{sub}</div>}
    </div>
  );
}

function PropertyRow({ p, onClick }) {
  const occ = Math.round((p.occupied / p.units) * 100);
  const statusClass =
    p.status === "Arrears" ? "arrears" :
    p.status === "Void"    ? "void"    : "healthy";
  return (
    <div onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "32px 1.4fr 1fr 1fr auto", gap: 14, alignItems: "center",
      padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
      cursor: "pointer",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: p.image,
        boxShadow: "inset 0 0 0 1px var(--border-2)",
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{p.type} · {p.city}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-mute)", letterSpacing: ".08em", textTransform: "uppercase" }}>Occupancy</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div className="progress" style={{ flex: 1 }}>
            <i style={{ width: occ + "%" }} />
          </div>
          <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--text-dim)" }}>{p.occupied}/{p.units}</div>
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{p.monthly ? fmtGBP(p.monthly) + "/mo" : <span style={{color:"var(--text-mute)"}}>—</span>}</div>
      <span className={"pill dot " + statusClass}>{p.status}</span>
    </div>
  );
}

function RentCollectionCard() {
  const r = D.rent;
  const pct = Math.round((r.collected / r.totalDue) * 100);
  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <div className="section-eyebrow">Rent collection</div>
          <h3 className="card-title" style={{ marginTop: 4 }}>{r.month}</h3>
        </div>
        <div style={{ color: "var(--text-dim)" }}>
          <MiniBars values={r.history} width={140} height={30} color="var(--mint)" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 14 }}>
        <Stat k="Total due"   v={fmtGBP(r.totalDue)} />
        <Stat k="Collected"   v={<span style={{ color: "var(--mint)" }}>{fmtGBP(r.collected)}</span>} />
        <Stat k="Outstanding" v={<span style={{ color: "var(--rose)" }}>{fmtGBP(r.outstanding)}</span>} />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="section-eyebrow">Collected</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{pct}%</div>
        </div>
      </div>
      <div className="progress" style={{ marginTop: 12, height: 8 }}>
        <i style={{ width: pct + "%" }} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="section-eyebrow" style={{ marginBottom: 6 }}>Overdue payments</div>
        <table className="tbl">
          <thead><tr><th>Tenant</th><th>Property</th><th>Due</th><th className="num">Amount</th><th>Age</th></tr></thead>
          <tbody>
          {r.overdue.map((o, i) => (
            <tr key={i}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Initials name={o.tenant} /> {o.tenant}</div></td>
              <td className="muted">{o.property}</td>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{o.due}</td>
              <td className="num">{fmtGBP(o.amount)}</td>
              <td><span className="pill arrears">{o.ageDays}d overdue</span></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceCard({ goto }) {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <h3 className="card-title">Compliance alerts</h3>
        <a className="b-action" style={{color:"var(--text-dim)", cursor:"pointer"}} onClick={() => goto("compliance")}>View all<Icon name="arrow" size={12} /></a>
      </div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th>Certificate</th><th>Property</th><th>Expiry</th><th>Status</th></tr></thead>
        <tbody>
        {D.compliance.filter(c => c.status !== "ok").slice(0, 3).map((c, i) => (
          <tr key={i}>
            <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: c.status === "expired" ? "var(--rose)" : "var(--amber)" }}><Icon name="shield" size={14} /></span>
              {c.cert}
            </td>
            <td className="muted">{c.property}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{c.expiry}</td>
            <td><span className={"pill dot " + (c.status === "expired" ? "expired" : "warn")}>
              {c.status === "expired" ? "Expired" : c.daysLeft + "d left"}
            </span></td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function RenewalsCard({ goto }) {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <h3 className="card-title">Upcoming renewals</h3>
        <a className="b-action" style={{color:"var(--text-dim)", cursor:"pointer"}} onClick={() => goto("tenancies")}>View all<Icon name="arrow" size={12} /></a>
      </div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th>Tenant</th><th>Unit</th><th>End</th><th>Status</th></tr></thead>
        <tbody>
        {D.renewals.map((r, i) => (
          <tr key={i}>
            <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Initials name={r.tenant} /> {r.tenant}</div></td>
            <td className="muted">{r.unit}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{r.end}</td>
            <td>
              {r.kind === "Periodic"
                ? <span className="pill" style={{color:"var(--cyan)", borderColor:"rgba(34,211,238,.25)", background:"rgba(34,211,238,.08)"}}>Periodic</span>
                : <span className={"pill " + (r.days < 60 ? "warn" : "ok")}>{r.days}d left</span>}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function Initials({ name }) {
  const ini = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return <span className="ini">{ini}</span>;
}

// ── Properties ───────────────────────────────────────────────────────────────
function Properties() {
  return (
    <div className="stack">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><Icon name="filter" size={14} />All status</button>
          <button className="btn ghost">All cities</button>
        </div>
        <button className="btn primary"><Icon name="plus" size={14} />Add property</button>
      </div>

      <div className="prop-grid">
        {D.properties.map(p => <PropertyCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

function PropertyCard({ p }) {
  const occ = Math.round((p.occupied / p.units) * 100);
  const statusClass = p.status === "Arrears" ? "arrears" : p.status === "Void" ? "void" : "healthy";
  return (
    <div className="card prop">
      <div className="prop-img" style={{ background: p.image }}>
        <div style={{ position: "absolute", top: 10, left: 12, right: 12, display: "flex", justifyContent: "space-between", zIndex: 1 }}>
          <span className="pill" style={{ background: "rgba(0,0,0,.4)", color: "#fff", borderColor: "rgba(255,255,255,.15)" }}>{p.type}</span>
          <span className={"pill dot " + statusClass}>{p.status}</span>
        </div>
      </div>
      <div className="prop-body">
        <div>
          <div className="prop-name">{p.name}</div>
          <div className="prop-meta">{p.city}</div>
        </div>
        <div className="prop-stats">
          <div className="prop-stat"><div className="k">Units</div><div className="v">{p.occupied}/{p.units}</div></div>
          <div className="prop-stat"><div className="k">Monthly</div><div className="v">{p.monthly ? fmtGBP(p.monthly) : "—"}</div></div>
          <div className="prop-stat"><div className="k">Occupancy</div><div className="v">{occ}%</div></div>
        </div>
        <div className="progress"><i style={{ width: occ + "%" }} /></div>
        {p.tenants.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-dim)" }}>
            <div style={{ display: "flex" }}>
              {p.tenants.slice(0, 3).map((t, i) => (
                <span key={i} style={{ marginLeft: i ? -8 : 0, boxShadow: "0 0 0 2px var(--bg)", borderRadius: 8 }}>
                  <Initials name={t} />
                </span>
              ))}
            </div>
            <span>{p.tenants.length} tenant{p.tenants.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tenancies ────────────────────────────────────────────────────────────────
function Tenancies() {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <h3 className="card-title">All tenancies</h3>
          <p className="card-sub">{D.tenancies.length} active agreements</p>
        </div>
        <button className="btn primary"><Icon name="plus" size={14} />New tenancy</button>
      </div>
      <table className="tbl" style={{ marginTop: 12 }}>
        <thead><tr><th>Tenant</th><th>Unit</th><th className="num">Rent</th><th className="num">Balance</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>
        {D.tenancies.map((t, i) => (
          <tr key={i}>
            <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Initials name={t.tenant} /> {t.tenant}</div></td>
            <td className="muted">{t.unit}</td>
            <td className="num">{fmtGBP(t.rent)}</td>
            <td className="num" style={{ color: t.balance < 0 ? "var(--rose)" : "var(--text-dim)" }}>{t.balance ? fmtGBP(t.balance) : "—"}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{t.start}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{t.end}</td>
            <td>
              <span className={"pill dot " + (t.status === "Arrears" ? "arrears" : t.status === "Periodic" ? "warn" : "healthy")}>{t.status}</span>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tenants ──────────────────────────────────────────────────────────────────
function Tenants() {
  const unique = [...new Map(D.tenancies.map(t => [t.tenant, t])).values()];
  return (
    <div className="prop-grid">
      {unique.map((t, i) => (
        <div key={i} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Initials name={t.tenant} />
            <div>
              <div style={{ fontWeight: 600 }}>{t.tenant}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.unit}</div>
            </div>
            <span className={"pill " + (t.balance < 0 ? "arrears" : "ok")} style={{ marginLeft: "auto" }}>
              {t.balance < 0 ? "In arrears" : "Up to date"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Stat k="Monthly rent" v={fmtGBP(t.rent)} />
            <Stat k="Balance" v={t.balance ? <span style={{ color: "var(--rose)" }}>{fmtGBP(t.balance)}</span> : "£0"} />
            <Stat k="Tenancy start" v={t.start} />
            <Stat k="Tenancy end" v={t.end} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Rent Ledger ──────────────────────────────────────────────────────────────
// `collected`, `outstanding`, `expenses` are derived from `tx` — see ledgerStats below.
// Each month only stores `due` (the rent owed) + the transaction list.
const LEDGER_MONTHS = [
  { key: "Jun '25", long: "June 2025",     due: 2000, tx: [
    { date: "05/06/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane", type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/06/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane", type: "Rent received", amount: 400,  method: "Bank transfer" },
  ]},
  { key: "Jul '25", long: "July 2025",     due: 3850, tx: [
    { date: "01/07/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/07/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/07/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/07/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
  ]},
  { key: "Aug '25", long: "August 2025",   due: 3850, tx: [
    { date: "01/08/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/08/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/08/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/08/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "24/08/2025", tenant: "—",              unit: "24 Thornton Rd",                type: "Maintenance",   amount: -180, method: "Card" },
  ]},
  { key: "Sep '25", long: "September 2025",due: 4350, tx: [
    { date: "01/09/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/09/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/09/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/09/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/09/2025", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 500,  method: "Standing order" },
  ]},
  { key: "Oct '25", long: "October 2025",  due: 4850, tx: [
    { date: "01/10/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/10/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/10/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/10/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/10/2025", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
  ]},
  { key: "Nov '25", long: "November 2025", due: 4850, tx: [
    { date: "01/11/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/11/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/11/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/11/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/11/2025", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
    { date: "22/11/2025", tenant: "—",              unit: "14b Coldharbour Lane",          type: "Maintenance",   amount: -185, method: "Card" },
  ]},
  { key: "Dec '25", long: "December 2025", due: 4850, tx: [
    { date: "01/12/2025", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/12/2025", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/12/2025", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/12/2025", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/12/2025", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
  ]},
  { key: "Jan '26", long: "January 2026",  due: 4850, tx: [
    { date: "01/01/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/01/2026", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/01/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/01/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/01/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
  ]},
  { key: "Feb '26", long: "February 2026", due: 4850, tx: [
    { date: "01/02/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/02/2026", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/02/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/02/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/02/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
  ]},
  { key: "Mar '26", long: "March 2026",    due: 4850, tx: [
    { date: "01/03/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/03/2026", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/03/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/03/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/03/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
    { date: "19/03/2026", tenant: "—",              unit: "7 Beech Grove",                 type: "Maintenance",   amount: -90,  method: "Card" },
  ]},
  { key: "Apr '26", long: "April 2026",    due: 4850, tx: [
    { date: "01/04/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "01/04/2026", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "05/04/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent received", amount: 1600, method: "Standing order" },
    { date: "10/04/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "15/04/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
  ]},
  { key: "May '26", long: "May 2026",      due: 4850, tx: [
    { date: "20/05/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd",        type: "Rent received", amount: 1100, method: "Bank transfer" },
    { date: "18/05/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",                 type: "Rent received", amount: 1000, method: "Standing order" },
    { date: "15/05/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour Lane",  type: "Rent received", amount: 400,  method: "Bank transfer" },
    { date: "10/05/2026", tenant: "Sarah Mitchell", unit: "Flat B, 24 Thornton Rd",        type: "Rent received", amount: 750,  method: "Bank transfer" },
    { date: "01/05/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour Lane",  type: "Rent due",      amount: 1600, method: "—" },
  ]},
];

// Derive collected / outstanding / expenses purely from the transaction list,
// so the headline numbers are always consistent with the table below.
function ledgerStats(month) {
  let collected = 0, outstanding = 0, expenses = 0;
  for (const t of month.tx) {
    if (t.type === "Rent received")   collected   += t.amount;
    else if (t.type === "Rent due")   outstanding += t.amount;
    else if (t.amount < 0)            expenses    += t.amount;
  }
  return {
    collected,
    outstanding,             // unpaid rent for the period
    expenses,                // negative number
    net: collected + expenses,
    due: month.due,
  };
}

function RentLedger() {
  const [selected, setSelected] = useState(null); // index | null
  const stats = useMemo(() => LEDGER_MONTHS.map(ledgerStats), []);
  const maxValue = useMemo(() => Math.max(...stats.map(s => Math.max(s.due, s.collected))), [stats]);
  const totals = useMemo(() => stats.reduce((a, s) => ({
    collected:   a.collected   + s.collected,
    due:         a.due         + s.due,
    outstanding: a.outstanding + s.outstanding,
    expenses:    a.expenses    + s.expenses,
  }), { collected: 0, due: 0, outstanding: 0, expenses: 0 }), [stats]);
  // Net deficit = unpaid rent (collected − due) + expenses (negative). Both pull Net down.
  const totalNet = (totals.collected - totals.due) + totals.expenses;
  const sel = selected != null ? LEDGER_MONTHS[selected] : null;
  const selStats = selected != null ? stats[selected] : null;

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="card-row">
          <div>
            <div className="section-eyebrow">Rent ledger</div>
            <h3 className="card-title" style={{ marginTop: 4 }}>Trailing 12 months</h3>
            <p className="card-sub" style={{ marginTop: 4 }}>Click any bar to inspect a single month's transactions.</p>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <Stat k="12mo collected" v={fmtGBP(totals.collected)} />
            <Stat k="12mo due"       v={fmtGBP(totals.due)} />
            <div className="net-stat" tabIndex={0}>
              <div className="section-eyebrow">Net</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: totalNet < 0 ? "var(--rose)" : "var(--mint)", fontVariantNumeric: "tabular-nums" }}>
                {totalNet < 0 ? "−" : ""}£{Math.abs(totalNet).toLocaleString("en-GB")}
              </div>
              <div className="net-stat-pop" role="tooltip">
                <div className="net-pop-title">Net = unpaid rent + expenses</div>
                <div className="net-pop-row"><em>Outstanding rent</em><b style={{ color: "var(--amber)" }}>{fmtGBP(-totals.outstanding)}</b></div>
                <div className="net-pop-row"><em>Expenses</em><b style={{ color: "var(--rose)" }}>{fmtGBP(totals.expenses)}</b></div>
                <div className="net-pop-divider" />
                <div className="net-pop-row"><em>Total</em><b style={{ color: totalNet < 0 ? "var(--rose)" : "var(--mint)" }}>{fmtGBP(totalNet)}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="ledger-chart" role="group" aria-label="Monthly rent received">
          {LEDGER_MONTHS.map((m, i) => {
            const s        = stats[i];
            const isSel    = i === selected;
            const dimmed   = selected != null && !isSel;
            const collectedPct = (s.collected / maxValue) * 100;
            const duePct       = (s.due       / maxValue) * 100;
            const isCurrent    = i === LEDGER_MONTHS.length - 1;
            return (
              <button
                key={m.key}
                type="button"
                className={"ledger-bar" + (isSel ? " sel" : "") + (dimmed ? " dim" : "") + (isCurrent ? " current" : "")}
                onClick={() => setSelected(isSel ? null : i)}
                aria-pressed={isSel}
                aria-label={`${m.long}: ${fmtGBP(s.collected)} collected of ${fmtGBP(s.due)} due`}
              >
                <span className="ledger-bar-track">
                  <span className="ledger-bar-due"       style={{ height: duePct + "%" }} />
                  <span className="ledger-bar-collected" style={{ height: collectedPct + "%" }} />
                </span>
                <span className="ledger-bar-tip" role="presentation">
                  <span className="tip-month">{m.long}</span>
                  <span className="tip-row"><em>Collected</em><b>{fmtGBP(s.collected)}</b></span>
                  <span className="tip-row"><em>Due</em><b>{fmtGBP(s.due)}</b></span>
                  {s.outstanding > 0 && <span className="tip-row tip-row-warn"><em>Outstanding</em><b>{fmtGBP(s.outstanding)}</b></span>}
                  {s.expenses    < 0 && <span className="tip-row tip-row-exp"><em>Expenses</em><b>{fmtGBP(s.expenses)}</b></span>}
                </span>
                <span className="ledger-bar-label">{m.key}</span>
              </button>
            );
          })}
        </div>

        <div className="ledger-legend">
          <span><i className="dot-collected" />Collected</span>
          <span><i className="dot-due" />Due (track)</span>
          <span style={{ marginLeft: "auto", color: "var(--text-mute)" }}>Tap a bar to filter the table below</span>
        </div>
      </div>

      <div className="card card-pad">
        {sel ? (
          <SelectedMonthDetail month={sel} stats={selStats} onClear={() => setSelected(null)} />
        ) : (
          <RecentTransactions />
        )}
      </div>
    </div>
  );
}

function SelectedMonthDetail({ month, stats, onClear }) {
  const { collected, due, outstanding, expenses, net } = stats;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card-row">
        <div>
          <div className="section-eyebrow">Selected month</div>
          <h3 className="card-title" style={{ marginTop: 4 }}>{month.long}</h3>
          <p className="card-sub" style={{ marginTop: 4 }}>
            Rent collected counts only “Rent received” entries. Expenses are tracked separately below.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClear}>
          <Icon name="x" size={13} />Clear selection
        </button>
      </div>

      <div className="month-stats">
        <div className="month-stat">
          <div className="month-stat-k">Rent collected</div>
          <div className="month-stat-v" style={{ color: "var(--mint)" }}>{fmtGBP(collected)}</div>
          <div className="month-stat-sub">of {fmtGBP(due)} due</div>
        </div>
        <div className="month-stat">
          <div className="month-stat-k">Rent due</div>
          <div className="month-stat-v">{fmtGBP(due)}</div>
          <div className="month-stat-sub">contracted for the period</div>
        </div>
        <div className="month-stat">
          <div className="month-stat-k">Outstanding</div>
          <div className="month-stat-v" style={{ color: outstanding > 0 ? "var(--amber)" : "var(--text-dim)" }}>{fmtGBP(outstanding)}</div>
          <div className="month-stat-sub">{outstanding > 0 ? "Unpaid rent" : "Fully collected"}</div>
        </div>
        <div className="month-stat">
          <div className="month-stat-k">Expenses</div>
          <div className="month-stat-v" style={{ color: expenses < 0 ? "var(--rose)" : "var(--text-dim)" }}>{fmtGBP(expenses)}</div>
          <div className="month-stat-sub">Maintenance &amp; other</div>
        </div>
        <div className="month-stat">
          <div className="month-stat-k">Net</div>
          <div className="month-stat-v" style={{ color: net < 0 ? "var(--rose)" : "var(--text)" }}>{fmtGBP(net)}</div>
          <div className="month-stat-sub">Collected − expenses</div>
        </div>
        <div className="month-stat">
          <div className="month-stat-k">Transactions</div>
          <div className="month-stat-v">{month.tx.length}</div>
          <div className="month-stat-sub">Across the month</div>
        </div>
      </div>

      <table className="tbl">
        <thead><tr><th>Date</th><th>Tenant</th><th>Unit</th><th>Type</th><th className="num">Amount</th><th>Method</th></tr></thead>
        <tbody>
          {month.tx.map((r, i) => (
            <tr key={i}>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{r.date}</td>
              <td>{r.tenant}</td>
              <td className="muted">{r.unit}</td>
              <td>{r.type}</td>
              <td className="num" style={{ color: r.amount < 0 ? "var(--rose)" : r.type === "Rent due" ? "var(--amber)" : "var(--mint)" }}>{fmtGBP(r.amount)}</td>
              <td className="muted">{r.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentTransactions() {
  // Combine the latest two months for a "recent" view.
  const recent = [...LEDGER_MONTHS[LEDGER_MONTHS.length - 1].tx];
  return (
    <div>
      <div className="card-row">
        <div>
          <h3 className="card-title">Recent transactions</h3>
          <p className="card-sub" style={{ marginTop: 4 }}>Showing current month — click any bar above to focus a different month.</p>
        </div>
      </div>
      <table className="tbl" style={{ marginTop: 10 }}>
        <thead><tr><th>Date</th><th>Tenant</th><th>Unit</th><th>Type</th><th className="num">Amount</th><th>Method</th></tr></thead>
        <tbody>
          {recent.map((r, i) => (
            <tr key={i}>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{r.date}</td>
              <td>{r.tenant}</td>
              <td className="muted">{r.unit}</td>
              <td>{r.type}</td>
              <td className="num" style={{ color: r.amount < 0 ? "var(--rose)" : r.type === "Rent due" ? "var(--amber)" : "var(--mint)" }}>{fmtGBP(r.amount)}</td>
              <td className="muted">{r.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Compliance ───────────────────────────────────────────────────────────────
function Compliance() {
  const expired = D.compliance.filter(c => c.status === "expired").length;
  const soon    = D.compliance.filter(c => c.status === "soon").length;
  const ok      = D.compliance.filter(c => c.status === "ok").length;
  return (
    <div className="stack">
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi">
          <div className="label">Expired</div>
          <div className="row"><div className="value" style={{ color: "var(--rose)" }}>{expired}</div></div>
          <div className="sub">Take action now</div>
        </div>
        <div className="card kpi">
          <div className="label">Expiring soon</div>
          <div className="row"><div className="value" style={{ color: "var(--amber)" }}>{soon}</div></div>
          <div className="sub">Within 90 days</div>
        </div>
        <div className="card kpi">
          <div className="label">Up to date</div>
          <div className="row"><div className="value" style={{ color: "var(--mint)" }}>{ok}</div></div>
          <div className="sub">No action needed</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-row">
          <h3 className="card-title">All certificates</h3>
          <button className="btn primary"><Icon name="plus" size={14} />Upload certificate</button>
        </div>
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead><tr><th>Certificate</th><th>Property</th><th>Expiry</th><th>Days left</th><th>Status</th></tr></thead>
          <tbody>
          {D.compliance.map((c, i) => (
            <tr key={i}>
              <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  color: c.status === "expired" ? "var(--rose)" : c.status === "soon" ? "var(--amber)" : "var(--mint)",
                  width: 28, height: 28, borderRadius: 8, background: "var(--surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}><Icon name="shield" size={14} /></span>
                {c.cert}
              </td>
              <td className="muted">{c.property}</td>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{c.expiry}</td>
              <td className="num" style={{ color: c.status === "expired" ? "var(--rose)" : c.status === "soon" ? "var(--amber)" : "var(--text-dim)" }}>
                {c.daysLeft < 0 ? Math.abs(c.daysLeft) + "d ago" : c.daysLeft + "d"}
              </td>
              <td><span className={"pill dot " + (c.status === "expired" ? "expired" : c.status === "soon" ? "warn" : "ok")}>
                {c.status === "expired" ? "Expired" : c.status === "soon" ? "Due soon" : "Valid"}
              </span></td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Maintenance ──────────────────────────────────────────────────────────────
function Maintenance() {
  const cols = ["Open", "Scheduled", "In progress", "Completed"];
  const grouped = cols.map(c => ({ name: c, items: D.maintenance.filter(m => m.status === c) }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      {grouped.map(g => (
        <div key={g.name} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card-row">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
            <span className="pill">{g.items.length}</span>
          </div>
          {g.items.map(m => (
            <div key={m.id} style={{ padding: 12, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                <span className={"pill " + (m.priority === "High" ? "arrears" : m.priority === "Medium" ? "warn" : "")}>{m.priority}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>{m.property}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-mute)" }}>
                <span>{m.assignee}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.reported}</span>
              </div>
            </div>
          ))}
          {g.items.length === 0 && <div style={{ fontSize: 12, color: "var(--text-mute)", padding: 8 }}>None</div>}
        </div>
      ))}
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────────────────────
function Team() {
  return (
    <div className="prop-grid">
      {D.team.map((t, i) => (
        <div key={i} className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Initials name={t.name} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.role}{t.role2 ? " · " + t.role2 : ""}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>{t.email}</div>
          </div>
          <button className="btn ghost" style={{ padding: "4px 8px" }}><Icon name="ext" size={12} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function Settings() {
  return (
    <div className="stack">
      <div className="card card-pad">
        <h3 className="card-title">Organisation</h3>
        <p className="card-sub">Visible to your team and on tenant communications.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <Field label="Legal name" value="Test LTD" />
          <Field label="Plan" value="Buy to Let" />
          <Field label="Company number" value="08 234 561" />
          <Field label="VAT" value="Not registered" />
          <Field label="Primary contact" value="Alex Mehnain" />
          <Field label="Address" value="71 Praed St, London W2 1NS" />
        </div>
      </div>
      <div className="card card-pad">
        <h3 className="card-title">Notifications</h3>
        <p className="card-sub">When to ping you about portfolio events.</p>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["Compliance certificate expires within 60 days", true],
            ["Rent payment is overdue by 7 days",             true],
            ["A unit becomes vacant",                          true],
            ["A new maintenance request is logged",            false],
            ["Tenancy renewal window opens",                   false],
          ].map(([label, on], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <Toggle on={on} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="section-eyebrow">{label}</span>
      <span style={{ padding: "9px 12px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }}>{value}</span>
    </label>
  );
}
function Toggle({ on }) {
  const [v, setV] = useState(on);
  return (
    <button onClick={() => setV(!v)} style={{
      width: 36, height: 20, borderRadius: 999, position: "relative", cursor: "pointer",
      background: v ? "var(--indigo-2)" : "var(--surface-3)", border: "1px solid var(--border-2)",
    }}>
      <span style={{
        position: "absolute", top: 1, left: v ? 17 : 1, width: 16, height: 16, borderRadius: 999,
        background: "#fff", transition: "left .15s",
      }} />
    </button>
  );
}

// Export
Object.assign(window, { Dashboard, Properties, Tenancies, Tenants, RentLedger, Compliance, Maintenance, Team, Settings });
