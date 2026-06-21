'use client'

import { useState, useEffect } from 'react'
import GooeyNav from './GooeyNav'

const NAV_ITEMS = [
  { label: 'Features',     href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Compliance',   href: '#compliance' },
  { label: 'Pricing',      href: '#pricing' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.feat-card'))
    const handlers: [HTMLElement, EventListener][] = cards.map(card => {
      const fn = ((e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', e.clientX - r.left + 'px')
        card.style.setProperty('--my', e.clientY - r.top + 'px')
      }) as EventListener
      card.addEventListener('mousemove', fn)
      return [card, fn]
    })
    return () => handlers.forEach(([el, fn]) => el.removeEventListener('mousemove', fn))
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el, i) => {
      ;(el as HTMLElement).style.transitionDelay = (i % 6) * 0.07 + 's'
      obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav id="lf-navbar" className={scrolled ? 'scrolled' : ''} role="navigation" aria-label="Main navigation">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', gap: '4px' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }} aria-label="LetroFlow home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={28} style={{ display: 'block' }} />
          </a>

          <div style={{ display: 'none' }} className="lf-desktop-nav">
            <GooeyNav
              items={NAV_ITEMS}
              particleCount={10}
              particleDistances={[60, 8]}
              particleR={80}
              animationTime={500}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
              initialActiveIndex={-1}
            />
          </div>

          <div style={{ gap: '8px', alignItems: 'center', display: 'none' }} className="lf-desktop-ctas">
            <a href="https://app.letroflow.com/login"  className="btn-secondary" style={{ padding: '7px 16px', fontSize: '14px' }}>Log in</a>
            <a href="https://app.letroflow.com/signup" className="btn-primary"   style={{ padding: '7px 18px', fontSize: '14px' }}>Get started free</a>
          </div>

          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="lf-mobile-menu"
            onClick={() => setMenuOpen(p => !p)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px', cursor: 'pointer', color: 'var(--text)' }}
            className="lf-hamburger"
          >
            {menuOpen ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <line x1={3} y1={6} x2={21} y2={6} /><line x1={3} y1={12} x2={21} y2={12} /><line x1={3} y1={18} x2={21} y2={18} />
              </svg>
            )}
          </button>
        </div>

        <div id="lf-mobile-menu" className={`lf-mobile-menu${menuOpen ? ' open' : ''}`} style={{ borderTop: menuOpen ? '1px solid var(--border)' : 'none', padding: menuOpen ? '14px 18px' : '0 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '14px' }}>
            {['Features', 'How it works', 'Compliance', 'Pricing'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} className="lf-nav-link" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px' }}>{label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="https://app.letroflow.com/login"  className="btn-secondary" style={{ padding: '10px 16px', fontSize: '14px', justifyContent: 'center' }}>Log in</a>
            <a href="https://app.letroflow.com/signup" className="btn-primary"   style={{ padding: '10px 18px', fontSize: '14px', justifyContent: 'center' }}>Get started free</a>
          </div>
        </div>
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .lf-desktop-nav  { display: flex !important; }
          .lf-desktop-ctas { display: flex !important; }
          .lf-hamburger    { display: none !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', padding: '150px 24px 80px', textAlign: 'center', overflow: 'hidden' }}>
        <div className="lf-blob" style={{ width: '700px', height: '700px', background: '#4338ca', top: '-250px', left: '-180px', display: 'none' }} aria-hidden="true" />
        <div className="lf-blob" style={{ width: '600px', height: '600px', background: '#0891b2', top: '-150px', right: '-180px', display: 'none' }} aria-hidden="true" />
        <style>{`@media (min-width: 768px) { .lf-blob { display: block !important; } }`}</style>

        <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto' }}>
          <div className="fade-up d1" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.22)', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 500, color: 'var(--indigo)', marginBottom: '28px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }} aria-hidden="true" />
            Built for UK landlords &amp; property managers
          </div>

          <h1 className="fade-up d2" style={{ fontSize: 'clamp(38px,6.5vw,76px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: '22px' }}>
            Property management<br /><span className="grad">done properly.</span>
          </h1>

          <p className="fade-up d3" style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'var(--text-dim)', maxWidth: '580px', margin: '0 auto 38px', lineHeight: 1.72 }}>
            Compliance alerts, rent tracking, maintenance kanban, and multi-property oversight — all in one dark, fast platform built for UK buy-to-let.
          </p>

          <div className="fade-up d4" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://app.letroflow.com/signup" className="btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
              Start for free
              <svg className="btn-arrow" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                <line x1={5} y1={12} x2={19} y2={12} /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="#features" className="btn-secondary" style={{ padding: '14px 24px', fontSize: '16px' }}>See features</a>
          </div>

          <p className="fade-up d5" style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-dim)' }}>
            No credit card required &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; UK data residency (AWS eu-west-2)
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="fade-up d6" style={{ maxWidth: '960px', margin: '56px auto 0', position: 'relative' }}>
          <div className="mockup-wrap">
            <div className="mockup-bar">
              <div className="mdot" style={{ background: '#fb7185' }} aria-hidden="true" />
              <div className="mdot" style={{ background: '#fbbf24' }} aria-hidden="true" />
              <div className="mdot" style={{ background: '#34d399' }} aria-hidden="true" />
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '5px', height: '20px', maxWidth: '220px', margin: '0 auto' }} aria-hidden="true" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: '360px' }} role="img" aria-label="LetroFlow dashboard preview">
              {/* Sidebar */}
              <div style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(129,140,248,0.12)', borderRadius: '8px', marginBottom: '12px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/letroflow-mark.svg" alt="" aria-hidden="true" width={26} height={26} style={{ borderRadius: '6px', flexShrink: 0, display: 'block' }} />
                  <div>
                    <div style={{ width: '58px', height: '7px', background: 'rgba(255,255,255,0.28)', borderRadius: '4px' }} />
                    <div style={{ width: '38px', height: '5px', background: 'rgba(255,255,255,0.14)', borderRadius: '4px', marginTop: '5px' }} />
                  </div>
                </div>
                {([['64px','0.18'],['76px','0.18'],['56px','0.18']] as const).map(([w, op], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px', borderRadius: '7px' }}>
                    <div style={{ width: '14px', height: '14px', background: `rgba(255,255,255,${op})`, borderRadius: '3px' }} />
                    <div style={{ width: w, height: '7px', background: `rgba(255,255,255,${op})`, borderRadius: '4px' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px', background: 'rgba(129,140,248,0.1)', borderRadius: '7px' }}>
                  <div style={{ width: '14px', height: '14px', background: 'rgba(129,140,248,0.5)', borderRadius: '3px' }} />
                  <div style={{ width: '52px', height: '7px', background: 'rgba(129,140,248,0.5)', borderRadius: '4px' }} />
                  <div style={{ marginLeft: 'auto', width: '16px', height: '16px', background: 'rgba(251,113,133,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fb7185', fontWeight: 700 }}>2</div>
                </div>
                {(['84px','68px'] as const).map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px', borderRadius: '7px' }}>
                    <div style={{ width: '14px', height: '14px', background: 'rgba(255,255,255,0.18)', borderRadius: '3px' }} />
                    <div style={{ width: w, height: '7px', background: 'rgba(255,255,255,0.18)', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>

              {/* Main panel */}
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  {([['£24,800','Rent collected','#34d399'],['2','In arrears','#fb7185'],['8','Properties','#818cf8'],['94%','Occupancy','#67e8f9']] as const).map(([val, label, color]) => (
                    <div key={label} className="glass" style={{ padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{val}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div className="glass" style={{ padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Compliance</div>
                  {([['Gas Safety — 14 Church St','pill-green','Valid'],['EICR — Flat 3B','pill-amber','Expiring soon'],['EPC — 22 Oak Avenue','pill-red','Expired']] as const).map(([name, pill, status]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text)' }}>{name}</span>
                      <span className={`pill ${pill}`}>{status}</span>
                    </div>
                  ))}
                </div>

                <div className="glass" style={{ padding: '12px', borderRadius: '10px', flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Rent Ledger</div>
                  {([
                    ['Sarah Johnson','£1,200','pill-green','Paid','linear-gradient(135deg,#818cf8,#67e8f9)'],
                    ['Marcus Townsend','£950','pill-red','Overdue','linear-gradient(135deg,#f59e0b,#ef4444)'],
                    ['Priya Sharma','£1,450','pill-green','Paid','linear-gradient(135deg,#34d399,#0891b2)'],
                  ] as const).map(([name, amount, pill, status, grad]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: grad, opacity: 0.7 }} />
                        <span style={{ fontSize: '11px', color: 'var(--text)' }}>{name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{amount}</span>
                        <span className={`pill ${pill}`}>{status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(129,140,248,0.18),rgba(103,232,249,0.08))', borderRadius: '13px', zIndex: -1, filter: 'blur(28px)', opacity: 0.6 }} aria-hidden="true" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="glass reveal" style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '24px' }} role="region" aria-label="Platform statistics">
            <div className="stat-item" style={{ textAlign: 'center', padding: '0 16px' }}>
              <div className="grad" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>500+</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Properties managed</div>
            </div>
            <div className="stat-item" style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--mint)' }}>99.9%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Platform uptime</div>
            </div>
            <div className="stat-item" style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--cyan)' }}>7</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Role-based permissions</div>
            </div>
            <div className="stat-item" style={{ textAlign: 'center', padding: '0 16px', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--amber)' }}>UK</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Data residency (GDPR)</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '40px 24px 80px', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }} className="reveal">
            <div className="pill pill-indigo" style={{ marginBottom: '16px' }}>Everything you need</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>
              One platform.<br /><span className="grad">Every landlord workflow.</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-dim)', maxWidth: '500px', margin: '0 auto' }}>
              From the moment you add a property to chasing overdue rent — LetroFlow has the tools UK landlords actually need.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '16px' }}>
            {FEATURES.map(({ icon, iconBg, iconColor, title, body, pills }) => (
              <div key={title} className="glass feat-card reveal" style={{ padding: '24px', borderRadius: '14px' }}>
                <div className="feat-icon" style={{ width: '40px', height: '40px', background: iconBg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.65 }}>{body}</p>
                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {pills.map(([cls, label]) => <span key={label} className={`pill ${cls}`}>{label}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: '40px 24px 80px', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }} className="reveal">
            <div className="pill pill-cyan" style={{ marginBottom: '16px' }}>Simple setup</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px' }}>
              Up and running in<br /><span className="grad">minutes, not months.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '16px' }}>
            {STEPS.map(({ num, title, body }) => (
              <div key={num} className="glass reveal step-card" style={{ padding: '28px 24px', borderRadius: '14px', textAlign: 'center' }}>
                <div className="step-num" style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg,rgba(129,140,248,0.3),rgba(103,232,249,0.2))', border: '1px solid rgba(129,140,248,0.4)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <span className="grad" style={{ fontSize: '18px', fontWeight: 800 }}>{num}</span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ── */}
      <section id="compliance" style={{ padding: '40px 24px 80px', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '48px', alignItems: 'center' }}>
            <div className="reveal">
              <div className="pill pill-amber" style={{ marginBottom: '16px' }}>UK Compliance</div>
              <h2 style={{ fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '18px' }}>
                Never miss a<br /><span className="grad">compliance deadline.</span>
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-dim)', lineHeight: 1.75, marginBottom: '28px' }}>
                UK landlords face fines up to £6,000 for missing a Gas Safety certificate, and can&apos;t serve notice without a valid EPC. LetroFlow tracks every certificate across every property and alerts you at 90, 60, and 30 days before expiry.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {COMPLIANCE_ITEMS.map(({ title, body }) => (
                  <div key={title} className="check-item">
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal" style={{ position: 'relative' }}>
              <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '18px' }}>Compliance Overview</div>
                {CERT_ROWS.map(({ name, date, pill, status, days, daysColor }, i) => (
                  <div key={name} className="cert-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', padding: '12px 8px', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: i === 2 ? 'var(--rose)' : 'var(--text-dim)' }}>{date}</div>
                    </div>
                    <span className={`pill ${pill}`}>{status}</span>
                    <div style={{ fontSize: '12px', color: daysColor }}>{days}</div>
                  </div>
                ))}
                <div style={{ marginTop: '18px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '9px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
                  </svg>
                  <span style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500 }}>EICR on Flat 3B expires in 41 days — book renewal now</span>
                </div>
              </div>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '160px', height: '160px', background: 'rgba(251,191,36,0.1)', borderRadius: '50%', filter: 'blur(40px)', zIndex: -1 }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '40px 24px 80px', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }} className="reveal">
            <div className="pill pill-green" style={{ marginBottom: '16px' }}>Simple pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>
              Start free.<br /><span className="grad">Scale when you&apos;re ready.</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-dim)' }}>No setup fees. No hidden costs. Cancel any time.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px', alignItems: 'start' }}>
            {/* Free */}
            <div className="glass pricing-card reveal" style={{ padding: '28px', borderRadius: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px' }}>£0</span>
                <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>/ month</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px' }}>For individual landlords just getting started.</p>
              <div className="lf-divider" style={{ marginBottom: '20px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {FREE_FEATURES.map(({ label, included }) => (
                  <div key={label} className="check-item">
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke={included ? '#34d399' : 'rgba(255,255,255,0.2)'} strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                      {included ? <polyline points="20 6 9 17 4 12"/> : <><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></>}
                    </svg>
                    <span style={{ fontSize: '14px', color: included ? 'var(--text)' : 'var(--text-dim)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <a href="https://app.letroflow.com/signup" className="btn-secondary" style={{ width: '100%', padding: '11px 16px', fontSize: '14px', justifyContent: 'center' }}>Get started free</a>
            </div>

            {/* Starter */}
            <div className="glass pricing-card pricing-featured reveal" style={{ padding: '28px', borderRadius: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,var(--indigo),var(--indigo-2))', borderRadius: '100px', padding: '4px 14px', fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>Most popular</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Starter</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px' }}>£29</span>
                <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>/ month</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px' }}>For landlords with a growing portfolio.</p>
              <div className="lf-divider" style={{ marginBottom: '20px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {['Up to 20 properties','Everything in Free','Up to 5 team members','Email compliance alerts','Maintenance kanban'].map(feat => (
                  <div key={feat} className="check-item">
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: '14px' }}>{feat}</span>
                  </div>
                ))}
              </div>
              <a href="https://app.letroflow.com/signup" className="btn-primary" style={{ width: '100%', padding: '11px 16px', fontSize: '14px', justifyContent: 'center' }}>
                Start 14-day trial
                <svg className="btn-arrow" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                  <line x1={5} y1={12} x2={19} y2={12}/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
            </div>

            {/* Pro */}
            <div className="glass pricing-card reveal" style={{ padding: '28px', borderRadius: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px' }}>£79</span>
                <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>/ month</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px' }}>For property managers and agencies.</p>
              <div className="lf-divider" style={{ marginBottom: '20px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {['Unlimited properties','Everything in Starter','Unlimited team members','Multiple organisations','Priority support'].map(feat => (
                  <div key={feat} className="check-item">
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: '14px' }}>{feat}</span>
                  </div>
                ))}
              </div>
              <a href="https://app.letroflow.com/signup" className="btn-secondary" style={{ width: '100%', padding: '11px 16px', fontSize: '14px', justifyContent: 'center' }}>Start 14-day trial</a>
            </div>
          </div>

          <p className="reveal" style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-dim)' }}>
            Stripe-powered billing · Cancel any time · Prices ex. VAT{' '}
            <span style={{ display: 'inline-block', marginLeft: '12px', padding: '3px 10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '100px', color: 'var(--amber)', fontWeight: 500 }}>Billing coming soon</span>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass reveal" style={{ padding: '60px 40px', borderRadius: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(103,232,249,0.1))', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} aria-hidden="true" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>
                Ready to get control<br />of your portfolio?
              </h2>
              <p style={{ fontSize: '17px', color: 'var(--text-dim)', maxWidth: '460px', margin: '0 auto 36px', lineHeight: 1.7 }}>
                Join landlords who&apos;ve already replaced the spreadsheets. Start free — no credit card required.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://app.letroflow.com/signup" className="btn-primary" style={{ padding: '15px 32px', fontSize: '17px' }}>
                  Get started for free
                  <svg className="btn-arrow" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                    <line x1={5} y1={12} x2={19} y2={12}/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
              <p style={{ marginTop: '18px', fontSize: '13px', color: 'var(--text-dim)' }}>Free plan. Upgrade when you grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="lf-divider" style={{ marginBottom: '40px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '32px', marginBottom: '48px' }}>
            <div>
              <a href="#" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: '16px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={32} style={{ display: 'block' }} />
              </a>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: '220px' }}>
                Property management software built for UK buy-to-let landlords and managers.
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(152,162,179,0.6)', marginTop: '12px' }}>UK data residency · GDPR compliant</p>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '14px' }}>Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[['#features','Features'],['#pricing','Pricing'],['#compliance','Compliance'],['#how-it-works','How it works']].map(([href, label]) => (
                  <a key={label} href={href} className="lf-footer-link">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '14px' }}>Account</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="https://app.letroflow.com/login"  className="lf-footer-link">Log in</a>
                <a href="https://app.letroflow.com/signup" className="lf-footer-link">Sign up</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '14px' }}>Legal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Privacy Policy','Terms of Service','Cookie Policy'].map(item => (
                  <span key={item} style={{ fontSize: '14px', color: 'rgba(152,162,179,0.5)', cursor: 'not-allowed' }}>{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="lf-divider" style={{ marginBottom: '24px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(152,162,179,0.5)' }}>&copy; 2026 LetroFlow. All rights reserved.</p>
            <p style={{ fontSize: '13px', color: 'rgba(152,162,179,0.5)' }}>Built for UK landlords &nbsp;·&nbsp; AWS eu-west-2 &nbsp;·&nbsp; GDPR</p>
          </div>
        </div>
      </footer>
    </>
  )
}

/* ── Static data ── */

const FEATURES = [
  { icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', iconBg: 'rgba(251,191,36,0.15)', iconColor: '#fbbf24', title: 'Compliance Tracking', body: 'Gas Safety, EICR, EPC, HMO licences — automated alerts at 90, 60 and 30 days before expiry. Never face a £6,000 fine again.', pills: [['pill-amber','Gas Safety'],['pill-indigo','EICR'],['pill-cyan','EPC'],['pill-green','HMO']] },
  { icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', iconBg: 'rgba(52,211,153,0.15)', iconColor: '#34d399', title: 'Rent Ledger', body: 'Log charges, record payments, and track arrears across every tenancy. Know exactly who owes what and when.', pills: [['pill-green','Payments'],['pill-red','Arrears'],['pill-indigo','Charges']] },
  { icon: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>', iconBg: 'rgba(103,232,249,0.15)', iconColor: '#67e8f9', title: 'Maintenance Kanban', body: 'Drag-and-drop issue board from reported to resolved. Assign to vendors, attach notes, and track SLAs visually.', pills: [['pill-cyan','Issues'],['pill-amber','Work Orders'],['pill-indigo','Vendors']] },
  { icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', iconBg: 'rgba(129,140,248,0.15)', iconColor: '#818cf8', title: 'Multi-Property Management', body: 'Manage unlimited properties and units across multiple organisations. Switch between portfolios in one click.', pills: [['pill-indigo','Properties'],['pill-cyan','Units'],['pill-green','Multi-org']] },
  { icon: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>', iconBg: 'rgba(251,113,133,0.15)', iconColor: '#fb7185', title: 'Tenancy Lifecycle', body: 'AST agreements, renewals, notice periods, Right to Rent checks, deposit protection reminders — all tracked end to end.', pills: [['pill-green','Active'],['pill-amber','In Notice'],['pill-red','Ended']] },
  { icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>', iconBg: 'rgba(52,211,153,0.15)', iconColor: '#34d399', title: 'Team & Roles', body: 'Invite managers, accountants, maintenance staff, and cleaners with role-based access. Seven roles, granular permissions.', pills: [['pill-indigo','Owner'],['pill-cyan','Manager'],['pill-amber','Accountant']] },
]

const STEPS = [
  { num: '1', title: 'Create your organisation', body: 'Sign up and set up your first portfolio organisation in under 2 minutes. No technical knowledge needed.' },
  { num: '2', title: 'Add properties & tenants', body: 'Import your properties, units, tenants and existing tenancy agreements. Upload compliance docs and go live.' },
  { num: '3', title: 'Manage with confidence', body: 'Let LetroFlow alert you to upcoming compliance deadlines, rent due dates, and maintenance jobs — automatically.' },
]

const COMPLIANCE_ITEMS = [
  { title: 'Gas Safety Certificate', body: 'Annual renewal required. Fines up to £6,000 for non-compliance.' },
  { title: 'EICR (Electrical Installation)', body: '5-year cycle. Mandatory for all private rented properties.' },
  { title: 'EPC (Energy Performance)', body: '10-year cycle. Must be rated E or above to let legally.' },
  { title: 'HMO Licences', body: 'Track licence expiry, occupancy limits, and inspection dates.' },
]

const CERT_ROWS = [
  { name: 'Gas Safety — 14 Church St', date: 'Renew by 15 Mar 2026', pill: 'pill-green', status: 'Valid',         days: '273 days',     daysColor: 'var(--text-dim)' },
  { name: 'EICR — Flat 3B Millbank',   date: 'Renew by 01 Aug 2026', pill: 'pill-amber', status: 'Expiring',     days: '41 days',      daysColor: 'var(--amber)' },
  { name: 'EPC — 22 Oak Avenue',        date: 'Expired 03 Jan 2026',  pill: 'pill-red',   status: 'Expired',      days: '169 days ago', daysColor: 'var(--rose)' },
  { name: 'HMO Licence — Maple House', date: 'Renew by 30 Sep 2026', pill: 'pill-green', status: 'Valid',         days: '101 days',     daysColor: 'var(--text-dim)' },
]

const FREE_FEATURES = [
  { label: 'Up to 3 properties',    included: true },
  { label: 'Compliance tracking',   included: true },
  { label: 'Rent ledger',           included: true },
  { label: 'Team members',          included: false },
  { label: 'Email alerts',          included: false },
]
