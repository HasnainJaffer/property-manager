// Atlas — screen components
const { useState, useMemo } = React;
const AD = window.PROPFLOW_DATA;

// ── Dashboard ────────────────────────────────────────────────────────────────
function AtlasDashboard({ goto }) {
  const k = AD.kpis;
  return (
    <div className="stack">
      <div className="banner">
        <span className="b-icon"><Icon name="warn" size={18} /></span>
        <div className="b-text">
          <span style={{ fontFamily: "Newsreader, serif", fontStyle: "italic", color: "var(--copper)" }}>Attention required —</span>{" "}
          gas safety at 24 Thornton Road is overdue for renewal.
        </div>
        <a className="b-action" onClick={() => goto("compliance")}>Resolve<Icon name="arrow" size={14} /></a>
      </div>

      {/* Portfolio hero */}
      <AtlasPortfolioHero goto={goto} />

      <div className="kpis">
        <AtlasKpi data={k.rentRoll}  accent="rent"    deltaKind="up"   delta="+£200 month-on-month" sparkColor="var(--sage)" />
        <AtlasKpi data={k.arrears}   accent="arrears" deltaKind="down" delta="2 missed payments"    sparkColor="var(--rose)"  valueFmt="gbp" />
        <AtlasKpi data={k.occupancy} accent="occ"     deltaKind="down" delta="One unit vacant"      sparkColor="var(--sage)"  valueFmt="pct" />
        <AtlasKpi data={k.expiring}  accent="exp"     deltaKind="flat" delta="Within 60 days"       sparkColor="var(--copper)" />
      </div>

      <div className="row-grid">
        <AtlasRentCard />
        <div className="stack">
          <AtlasComplianceCard goto={goto} />
          <AtlasRenewalsCard goto={goto} />
        </div>
      </div>
    </div>
  );
}

function AtlasKpi({ data, accent, sparkColor, delta, deltaKind, valueFmt }) {
  const fmt = (v) =>
    valueFmt === "gbp" ? fmtGBP(v) :
    valueFmt === "pct" ? v + "%" :
    accent === "rent" ? fmtGBP(v) : v;
  return (
    <div className="card kpi">
      <div className="label">{data.label}</div>
      <div className="row">
        <div className={"value accent-" + accent}>{fmt(data.value)}</div>
        <Sparkline values={data.spark} width={86} height={28} color={sparkColor}
                   fill={`color-mix(in oklab, ${sparkColor} 14%, transparent)`} />
      </div>
      <div className="sub">
        <span>{data.sub}</span>
        {delta && <span className={"delta " + deltaKind}>{delta}</span>}
      </div>
    </div>
  );
}

function AtlasPortfolioHero({ goto }) {
  const totalUnits = AD.properties.reduce((a, p) => a + p.units, 0);
  const occupied = AD.properties.reduce((a, p) => a + p.occupied, 0);
  const occPct = Math.round((occupied / totalUnits) * 100);
  const monthlyTotal = AD.properties.reduce((a, p) => a + p.monthly, 0);

  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <div className="section-eyebrow">Portfolio overview</div>
          <h2 style={{ margin: "4px 0 0", fontFamily: "Newsreader, serif", fontWeight: 400, fontSize: 26, letterSpacing: "-0.015em" }}>
            Four addresses, <em style={{ color: "var(--copper)" }}>{totalUnits}</em> doors,
            {" "}<em style={{ fontStyle: "italic" }}>healthy</em>.
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><Icon name="filter" size={14} />Filter</button>
          <button className="btn"><Icon name="plus" size={14} />Add property</button>
        </div>
      </div>

      <div className="rule" />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ color: "var(--sage)" }}>
            <Donut value={occPct} size={102} thickness={7} color="currentColor" track="var(--surface-3)" label={occPct + "%"} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AtlasStat k="Occupancy" v={`${occupied} of ${totalUnits}`} sub="units let" />
            <AtlasStat k="Gross monthly" v={fmtGBP(monthlyTotal)} sub="recurring income" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {AD.properties.map((p) => <AtlasPropertyRow key={p.id} p={p} onClick={() => goto("properties")} />)}
        </div>
      </div>
    </div>
  );
}

function AtlasStat({ k, v, sub }) {
  return (
    <div>
      <div className="section-eyebrow">{k}</div>
      <div style={{ fontFamily: "Newsreader, serif", fontSize: 24, fontWeight: 400, letterSpacing: "-0.015em", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{v}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{sub}</div>}
    </div>
  );
}

function AtlasPropertyRow({ p, onClick }) {
  const occ = Math.round((p.occupied / p.units) * 100);
  const statusClass = p.status === "Arrears" ? "arrears" : p.status === "Void" ? "void" : "healthy";
  return (
    <div onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "40px 1.4fr 1fr 1fr auto", gap: 16, alignItems: "center",
      padding: "10px 14px", borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--border)",
      cursor: "pointer", transition: "background .15s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: p.image,
        boxShadow: "inset 0 0 0 1px var(--border-2)",
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "Newsreader, serif", fontSize: 15.5, fontWeight: 400 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{p.type} · {p.city}</div>
      </div>
      <div>
        <div className="section-eyebrow" style={{ fontSize: 11 }}>Occupancy</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div className="progress" style={{ flex: 1 }}>
            <i style={{ width: occ + "%" }} />
          </div>
          <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--text-dim)" }}>{p.occupied}/{p.units}</div>
        </div>
      </div>
      <div style={{ fontFamily: "Newsreader, serif", fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{p.monthly ? fmtGBP(p.monthly) + "/mo" : <span style={{color:"var(--text-mute)"}}>—</span>}</div>
      <span className={"pill dot " + statusClass}>{p.status}</span>
    </div>
  );
}

function AtlasRentCard() {
  const r = AD.rent;
  const pct = Math.round((r.collected / r.totalDue) * 100);
  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <div className="section-eyebrow">Rent collection</div>
          <h3 className="card-title">{r.month}</h3>
        </div>
        <div style={{ color: "var(--sage)" }}>
          <MiniBars values={r.history} width={150} height={36} color="currentColor" gap={3} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, marginTop: 14 }}>
        <AtlasStat k="Due"        v={fmtGBP(r.totalDue)} />
        <AtlasStat k="Collected"  v={<span style={{ color: "var(--sage)" }}>{fmtGBP(r.collected)}</span>} />
        <AtlasStat k="Outstanding"v={<span style={{ color: "var(--rose)" }}>{fmtGBP(r.outstanding)}</span>} />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="section-eyebrow">Collected</div>
          <div style={{ fontFamily: "Newsreader, serif", fontSize: 26, fontWeight: 400 }}>{pct}<span style={{ fontSize: 18 }}>%</span></div>
        </div>
      </div>
      <div className="progress" style={{ marginTop: 12, height: 6 }}>
        <i style={{ width: pct + "%" }} />
      </div>

      <div className="rule" style={{ margin: "20px 0 0" }} />
      <div className="section-eyebrow" style={{ marginTop: 14 }}>Overdue payments</div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th>Tenant</th><th>Property</th><th>Due</th><th className="num">Amount</th><th>Age</th></tr></thead>
        <tbody>
        {r.overdue.map((o, i) => (
          <tr key={i}>
            <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><AtlasInitials name={o.tenant} /> {o.tenant}</div></td>
            <td className="muted">{o.property}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{o.due}</td>
            <td className="num">{fmtGBP(o.amount)}</td>
            <td><span className="pill arrears">{o.ageDays} days</span></td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function AtlasComplianceCard({ goto }) {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <h3 className="card-title">Compliance</h3>
        <a className="b-action" onClick={() => goto("compliance")}>All<Icon name="arrow" size={12} /></a>
      </div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <tbody>
        {AD.compliance.filter(c => c.status !== "ok").slice(0, 3).map((c, i) => (
          <tr key={i}>
            <td style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px" }}>
              <span style={{ color: c.status === "expired" ? "var(--rose)" : "var(--copper)" }}><Icon name="shield" size={16} /></span>
              <div>
                <div style={{ fontFamily: "Newsreader, serif", fontSize: 14 }}>{c.cert}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{c.property} · expires {c.expiry}</div>
              </div>
            </td>
            <td style={{ textAlign: "right", padding: "12px 4px" }}>
              <span className={"pill dot " + (c.status === "expired" ? "expired" : "warn")}>
                {c.status === "expired" ? "Expired" : c.daysLeft + "d"}
              </span>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function AtlasRenewalsCard({ goto }) {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <h3 className="card-title">Upcoming renewals</h3>
        <a className="b-action" onClick={() => goto("tenancies")}>All<Icon name="arrow" size={12} /></a>
      </div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <tbody>
        {AD.renewals.map((r, i) => (
          <tr key={i}>
            <td style={{ padding: "12px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AtlasInitials name={r.tenant} />
                <div>
                  <div style={{ fontFamily: "Newsreader, serif", fontSize: 14 }}>{r.tenant}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{r.unit}</div>
                </div>
              </div>
            </td>
            <td style={{ textAlign: "right", padding: "12px 4px" }}>
              {r.kind === "Periodic"
                ? <span className="pill" style={{color:"var(--copper)", borderColor:"rgba(217,151,100,.3)", background:"rgba(217,151,100,.08)"}}>Periodic</span>
                : <span className={"pill " + (r.days < 60 ? "warn" : "ok")}>{r.days}d</span>}
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{r.end}</div>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function AtlasInitials({ name }) {
  const ini = name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return <span className="ini">{ini}</span>;
}

// ── Properties ───────────────────────────────────────────────────────────────
function AtlasProperties() {
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
        {AD.properties.map(p => <AtlasPropertyCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

function AtlasPropertyCard({ p }) {
  const occ = Math.round((p.occupied / p.units) * 100);
  const statusClass = p.status === "Arrears" ? "arrears" : p.status === "Void" ? "void" : "healthy";
  return (
    <div className="card prop">
      <div className="prop-img" style={{ background: p.image }}>
        <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", zIndex: 1 }}>
          <span className="pill" style={{ background: "rgba(0,0,0,.45)", color: "#fff", borderColor: "rgba(255,255,255,.18)" }}>{p.type}</span>
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
        {p.tenants.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-dim)" }}>
            <div style={{ display: "flex" }}>
              {p.tenants.slice(0, 3).map((t, i) => (
                <span key={i} style={{ marginLeft: i ? -10 : 0, boxShadow: "0 0 0 2px var(--bg)", borderRadius: 999 }}>
                  <AtlasInitials name={t} />
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
function AtlasTenancies() {
  return (
    <div className="card card-pad">
      <div className="card-row">
        <div>
          <h3 className="card-title">All tenancies</h3>
          <p className="card-sub">{AD.tenancies.length} active agreements</p>
        </div>
        <button className="btn primary"><Icon name="plus" size={14} />New tenancy</button>
      </div>
      <table className="tbl" style={{ marginTop: 16 }}>
        <thead><tr><th>Tenant</th><th>Unit</th><th className="num">Rent</th><th className="num">Balance</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>
        {AD.tenancies.map((t, i) => (
          <tr key={i}>
            <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><AtlasInitials name={t.tenant} /> <span style={{ fontFamily: "Newsreader, serif" }}>{t.tenant}</span></div></td>
            <td className="muted">{t.unit}</td>
            <td className="num">{fmtGBP(t.rent)}</td>
            <td className="num" style={{ color: t.balance < 0 ? "var(--rose)" : "var(--text-dim)" }}>{t.balance ? fmtGBP(t.balance) : "—"}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{t.start}</td>
            <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{t.end}</td>
            <td><span className={"pill dot " + (t.status === "Arrears" ? "arrears" : t.status === "Periodic" ? "warn" : "healthy")}>{t.status}</span></td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tenants ──────────────────────────────────────────────────────────────────
function AtlasTenants() {
  const unique = [...new Map(AD.tenancies.map(t => [t.tenant, t])).values()];
  return (
    <div className="prop-grid">
      {unique.map((t, i) => (
        <div key={i} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AtlasInitials name={t.tenant} />
            <div>
              <div style={{ fontFamily: "Newsreader, serif", fontSize: 16 }}>{t.tenant}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.unit}</div>
            </div>
            <span className={"pill " + (t.balance < 0 ? "arrears" : "ok")} style={{ marginLeft: "auto" }}>
              {t.balance < 0 ? "In arrears" : "Up to date"}
            </span>
          </div>
          <div className="rule" style={{ margin: 0 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <AtlasStat k="Monthly rent" v={fmtGBP(t.rent)} />
            <AtlasStat k="Balance" v={t.balance ? <span style={{ color: "var(--rose)" }}>{fmtGBP(t.balance)}</span> : "£0"} />
            <AtlasStat k="Tenancy start" v={t.start} />
            <AtlasStat k="Tenancy end" v={t.end} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Rent Ledger ──────────────────────────────────────────────────────────────
function AtlasRentLedger() {
  const months = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="card-row">
          <div>
            <div className="section-eyebrow">Rent ledger</div>
            <h3 className="card-title">Trailing twelve months</h3>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            <AtlasStat k="YTD collected" v={fmtGBP(48750)} />
            <AtlasStat k="YTD due"      v={fmtGBP(50800)} />
            <AtlasStat k="Net" v={<span style={{ color: "var(--rose)" }}>−£2,050</span>} />
          </div>
        </div>
        <div className="rule" />
        <div style={{ color: "var(--copper)" }}>
          <MiniBars values={AD.rent.history} width={1100} height={140} color="currentColor" gap={8} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Newsreader, serif", fontStyle: "italic", fontSize: 11.5, color: "var(--text-dim)", marginTop: 8 }}>
            {months.map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="card-title">Recent transactions</h3>
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead><tr><th>Date</th><th>Tenant</th><th>Unit</th><th>Type</th><th className="num">Amount</th><th>Method</th></tr></thead>
          <tbody>
          {[
            { date: "20/05/2026", tenant: "Sarah Mitchell", unit: "Flat A, 24 Thornton Rd", type: "Rent received", amount: 1100, method: "Bank transfer" },
            { date: "18/05/2026", tenant: "Marcus Lee",     unit: "7 Beech Grove",          type: "Rent received", amount: 1000, method: "Standing order" },
            { date: "15/05/2026", tenant: "Emma Thompson",  unit: "Flat 1, 14b Coldharbour",type: "Rent received", amount: 400,  method: "Bank transfer" },
            { date: "10/05/2026", tenant: "—",              unit: "24 Thornton Rd",         type: "Maintenance",   amount: -180, method: "Card" },
            { date: "01/05/2026", tenant: "Daniel Okafor",  unit: "Flat 2, 14b Coldharbour",type: "Rent due",      amount: 1600, method: "—" },
          ].map((r, i) => (
            <tr key={i}>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{r.date}</td>
              <td style={{ fontFamily: "Newsreader, serif" }}>{r.tenant}</td>
              <td className="muted">{r.unit}</td>
              <td>{r.type}</td>
              <td className="num" style={{ color: r.amount < 0 ? "var(--rose)" : r.type === "Rent due" ? "var(--copper)" : "var(--sage)" }}>{fmtGBP(r.amount)}</td>
              <td className="muted">{r.method}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Compliance ───────────────────────────────────────────────────────────────
function AtlasCompliance() {
  const expired = AD.compliance.filter(c => c.status === "expired").length;
  const soon    = AD.compliance.filter(c => c.status === "soon").length;
  const ok      = AD.compliance.filter(c => c.status === "ok").length;
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
          <div className="row"><div className="value" style={{ color: "var(--copper)" }}>{soon}</div></div>
          <div className="sub">Within 90 days</div>
        </div>
        <div className="card kpi">
          <div className="label">Up to date</div>
          <div className="row"><div className="value" style={{ color: "var(--sage)" }}>{ok}</div></div>
          <div className="sub">No action needed</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-row">
          <h3 className="card-title">All certificates</h3>
          <button className="btn primary"><Icon name="plus" size={14} />Upload certificate</button>
        </div>
        <table className="tbl" style={{ marginTop: 14 }}>
          <thead><tr><th>Certificate</th><th>Property</th><th>Expiry</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>
          {AD.compliance.map((c, i) => (
            <tr key={i}>
              <td style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  color: c.status === "expired" ? "var(--rose)" : c.status === "soon" ? "var(--copper)" : "var(--sage)",
                  width: 32, height: 32, borderRadius: 999, background: "var(--surface-2)", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--border)",
                }}><Icon name="shield" size={15} /></span>
                <span style={{ fontFamily: "Newsreader, serif", fontSize: 15 }}>{c.cert}</span>
              </td>
              <td className="muted">{c.property}</td>
              <td className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>{c.expiry}</td>
              <td className="num" style={{ color: c.status === "expired" ? "var(--rose)" : c.status === "soon" ? "var(--copper)" : "var(--text-dim)" }}>
                {c.daysLeft < 0 ? Math.abs(c.daysLeft) + " ago" : c.daysLeft + "d"}
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
function AtlasMaintenance() {
  const cols = ["Open", "Scheduled", "In progress", "Completed"];
  const grouped = cols.map(c => ({ name: c, items: AD.maintenance.filter(m => m.status === c) }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
      {grouped.map(g => (
        <div key={g.name} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card-row">
            <h4 style={{ margin: 0, fontFamily: "Newsreader, serif", fontWeight: 400, fontSize: 17 }}>{g.name}</h4>
            <span className="pill">{g.items.length}</span>
          </div>
          <div className="rule" style={{ margin: 0 }} />
          {g.items.map(m => (
            <div key={m.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: "Newsreader, serif", fontSize: 14.5 }}>{m.title}</div>
                <span className={"pill " + (m.priority === "High" ? "arrears" : m.priority === "Medium" ? "warn" : "")}>{m.priority}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>{m.property}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--text-mute)" }}>
                <span style={{ fontStyle: "italic", fontFamily: "Newsreader, serif" }}>{m.assignee}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.reported}</span>
              </div>
            </div>
          ))}
          {g.items.length === 0 && <div style={{ fontSize: 12, color: "var(--text-mute)", padding: 8, fontStyle: "italic", fontFamily: "Newsreader, serif" }}>Nothing here.</div>}
        </div>
      ))}
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────────────────────
function AtlasTeam() {
  return (
    <div className="prop-grid">
      {AD.team.map((t, i) => (
        <div key={i} className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <AtlasInitials name={t.name} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Newsreader, serif", fontSize: 16 }}>{t.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{t.role}{t.role2 ? " · " + t.role2 : ""}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-mute)", marginTop: 2 }}>{t.email}</div>
          </div>
          <button className="btn ghost" style={{ padding: "4px 8px" }}><Icon name="ext" size={12} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function AtlasSettings() {
  return (
    <div className="stack">
      <div className="card card-pad">
        <h3 className="card-title">Organisation</h3>
        <p className="card-sub">Visible to your team and on tenant communications.</p>
        <div className="rule" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <AtlasField label="Legal name" value="Test LTD" />
          <AtlasField label="Plan" value="Buy to Let" />
          <AtlasField label="Company number" value="08 234 561" />
          <AtlasField label="VAT" value="Not registered" />
          <AtlasField label="Primary contact" value="Alex Mehnain" />
          <AtlasField label="Address" value="71 Praed St, London W2 1NS" />
        </div>
      </div>
      <div className="card card-pad">
        <h3 className="card-title">Notifications</h3>
        <p className="card-sub">When to ping you about portfolio events.</p>
        <div className="rule" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["Compliance certificate expires within 60 days", true],
            ["Rent payment is overdue by 7 days",             true],
            ["A unit becomes vacant",                          true],
            ["A new maintenance request is logged",            false],
            ["Tenancy renewal window opens",                   false],
          ].map(([label, on], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13.5, fontFamily: "Newsreader, serif" }}>{label}</span>
              <AtlasToggle on={on} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function AtlasField({ label, value }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="section-eyebrow">{label}</span>
      <span style={{ padding: "10px 14px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "Newsreader, serif", fontSize: 14 }}>{value}</span>
    </label>
  );
}
function AtlasToggle({ on }) {
  const [v, setV] = useState(on);
  return (
    <button onClick={() => setV(!v)} style={{
      width: 38, height: 20, borderRadius: 999, position: "relative", cursor: "pointer",
      background: v ? "var(--copper)" : "var(--surface-3)", border: "1px solid var(--border-2)",
    }}>
      <span style={{
        position: "absolute", top: 1, left: v ? 19 : 1, width: 16, height: 16, borderRadius: 999,
        background: "#fff", transition: "left .15s",
      }} />
    </button>
  );
}

Object.assign(window, {
  AtlasDashboard, AtlasProperties, AtlasTenancies, AtlasTenants,
  AtlasRentLedger, AtlasCompliance, AtlasMaintenance, AtlasTeam, AtlasSettings,
});
