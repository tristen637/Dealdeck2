'use client'
import Link from 'next/link'

const tools = [
  { icon: '🏠', title: 'SFH Underwriter', desc: 'Fix & flip or buy & hold — profit, ROI, 70% rule, LTV, equity spread, all-in cost calculated instantly.' },
  { icon: '🏢', title: 'Multifamily Underwriter', desc: 'NOI, cap rate, DSCR, cash-on-cash, GRM, and monthly cash flow for any unit count.' },
  { icon: '🏘️', title: 'Mobile Home Park', desc: 'POH/TOH analysis, lagoon/well flags, infill upside calculator, and park-specific benchmarks.' },
  { icon: '🏷️', title: 'Wholesale Calculator', desc: 'MAO, assignment fee, offer range, exit strategy — know your numbers before you make the call.' },
  { icon: '📋', title: 'Paste Any Deal', desc: 'Paste a text, email, rent roll, or P&L — AI reads it and underwrites it in seconds.' },
  { icon: '⚡', title: 'AI Verdict', desc: 'Strong Buy, Good Deal, Marginal, or Pass — with risks, upside, and negotiation tips every time.' },
]

const steps = [
  ['1', 'Paste or enter deal info', 'Drop in a text, email, listing, rent roll — anything you have on the deal.'],
  ['2', 'AI underwrites instantly', 'All numbers calculated, risks flagged, verdict delivered in seconds.'],
  ['3', 'Know whether to buy', 'Clear answer: Strong Buy, Good Deal, Marginal, or Pass — with the full reasoning.'],
]

const faqs = [
  ['What deal types does it cover?', 'SFH fix & flip, SFH buy & hold, multifamily (duplex through large portfolios), mobile home parks, and wholesale deals. More being added regularly.'],
  ['Can I paste info from a text or email?', 'Yes — that\'s the main feature. Paste anything and AI extracts all the numbers and underwrites it automatically. You can also attach PDFs and photos.'],
  ['What happens after my trial?', 'You\'ll be prompted to upgrade to Pro at $67/month. If you don\'t upgrade, your account is locked until you do. No surprise charges.'],
  ['Can I cancel anytime?', 'Yes. Cancel from your account settings and you won\'t be charged again. You keep access until the end of your billing period.'],
  ['Is my data secure?', 'Yes. All deal data is tied to your account and not shared with anyone. AI analysis runs through encrypted API calls.'],
]

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E7EB', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#111827' }}>Deal<span style={{ color: '#10B981' }}>Desk</span></div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="#tools" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Tools</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Pricing</a>
          <a href="#faq" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>FAQ</a>
          <Link href="/auth" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Log in</Link>
          <Link href="/auth?signup=true" style={{ background: '#10B981', color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 780, margin: '0 auto', padding: '90px 24px 70px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#ECFDF5', color: '#065F46', fontSize: 13, fontWeight: 600, padding: '5px 16px', borderRadius: 20, marginBottom: 24, border: '1px solid #A7F3D0' }}>
          Built for real estate investors & wholesalers
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 22, color: '#111827', letterSpacing: '-1px' }}>
          Know if a deal is worth it<br /><span style={{ color: '#10B981' }}>before you make the call</span>
        </h1>
        <p style={{ fontSize: 18, color: '#6B7280', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px' }}>
          Paste a text from your wholesaler, attach a rent roll, or type in the numbers — DealDesk underwrites SFH, multifamily, mobile home parks, and wholesale deals in seconds.
        </p>
        <Link href="/auth?signup=true" style={{ display: 'inline-block', background: '#10B981', color: '#fff', padding: '16px 40px', borderRadius: 12, fontSize: 17, fontWeight: 700, textDecoration: 'none', marginBottom: 14 }}>
          Start Free — 7 Days, Full Access
        </Link>
        <div style={{ fontSize: 14, color: '#9CA3AF' }}>No credit card required · $67/month after trial · Cancel anytime</div>
      </section>

      {/* Social proof strip */}
      <div style={{ background: '#111827', padding: '18px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['SFH · Multifamily · MHP · Wholesale', 'Paste any deal info — AI fills it out', 'Get a verdict in seconds', 'Full access on free trial'].map(t => (
            <div key={t} style={{ fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#10B981' }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      <section id="tools" style={{ background: '#F9FAFB', padding: '70px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.5px' }}>Every tool you need. All included.</h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 50, fontSize: 16 }}>No locked features. No tiers. Everything in Pro.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {tools.map(t => (
              <div key={t.title} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px 20px' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{t.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#111827' }}>{t.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '70px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 50, letterSpacing: '-0.5px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {steps.map(([n, title, desc]) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#111827', color: '#10B981', fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{n}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#111827' }}>{title}</div>
                <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: '#F9FAFB', padding: '70px 24px' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.5px' }}>Simple, honest pricing</h2>
          <p style={{ color: '#6B7280', marginBottom: 40, fontSize: 16 }}>One plan. Everything included. No surprises.</p>

          <div style={{ background: '#fff', border: '2px solid #10B981', borderRadius: 20, padding: '36px 32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 18px', borderRadius: 20, whiteSpace: 'nowrap' }}>
              7-DAY FREE TRIAL · FULL ACCESS
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#111827', marginBottom: 6 }}>DealDesk Pro</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#10B981', lineHeight: 1, marginBottom: 4 }}>$67</div>
            <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 28 }}>per month · cancel anytime</div>
            <ul style={{ listStyle: 'none', marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {[
                'Unlimited deal analyses',
                'SFH Underwriter (flip & rental)',
                'Multifamily Underwriter',
                'Mobile Home Park Underwriter',
                'Wholesale Calculator',
                'Paste any deal — AI fills it out',
                'Upload PDFs, photos & rent rolls',
                'AI verdict with risks & negotiation tips',
                'Deal history & tracking',
                'Every new tool we add — included',
              ].map(f => (
                <li key={f} style={{ fontSize: 15, color: '#374151', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth?signup=true" style={{ display: 'block', background: '#10B981', color: '#fff', padding: '15px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              Start Free Trial
            </Link>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 12 }}>No credit card required to start</p>
          </div>

          <div style={{ marginTop: 24, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4 }}>💡 Think about it this way</div>
            <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.65 }}>One good deal — or one bad deal avoided — easily pays for a full year of DealDesk. At $67/month it's one of the cheapest decisions you'll make.</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '70px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 50, letterSpacing: '-0.5px' }}>Common questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {faqs.map(([q, a], i) => (
              <div key={q} style={{ borderTop: i === 0 ? '1px solid #E5E7EB' : 'none', borderBottom: '1px solid #E5E7EB', padding: '20px 0' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8 }}>{q}</div>
                <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: '#111827', padding: '70px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#F9FAFB', marginBottom: 12, letterSpacing: '-0.5px' }}>Start underwriting smarter today</h2>
        <p style={{ color: '#9CA3AF', fontSize: 16, marginBottom: 32 }}>7-day free trial. Full access. No credit card.</p>
        <Link href="/auth?signup=true" style={{ display: 'inline-block', background: '#10B981', color: '#fff', padding: '16px 40px', borderRadius: 12, fontSize: 17, fontWeight: 700, textDecoration: 'none' }}>
          Start Free Trial
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E5E7EB', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 8 }}>Deal<span style={{ color: '#10B981' }}>Desk</span></div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>© {new Date().getFullYear()} DealDesk · Built for real estate investors</div>
      </footer>
    </div>
  )
}
