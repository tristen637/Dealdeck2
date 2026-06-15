'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const Underwriter = dynamic(() => import('@/components/underwriter/Underwriter'), { ssr: false })
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''

function StatBox({ label, value, color, bg }: any) {
  return (
    <div style={{ background: bg || '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || '#111827' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function AdminPanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/admin').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  if (loading) return (<div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Loading stats…</div>)
  if (!stats) return (<div style={{ textAlign: 'center', padding: 40, color: '#991B1B' }}>Could not load stats</div>)
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 20, color: '#111827', marginBottom: 16 }}>Admin Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatBox label="Total Signups" value={stats.totalSignups} color="#111827" />
        <StatBox label="Active Trials" value={stats.activeTrials} color="#F59E0B" bg="#FFFBEB" />
        <StatBox label="Paying" value={stats.paying} color="#10B981" bg="#ECFDF5" />
        <StatBox label="Expired" value={stats.expired} color="#6B7280" bg="#F9FAFB" />
        <StatBox label="Total Analyses" value={stats.totalAnalyses} color="#6D28D9" bg="#F5F3FF" />
      </div>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#111827', color: '#F9FAFB', fontWeight: 700, fontSize: 14 }}>Recent Signups</div>
        {stats.recentSignups.length === 0 && (<div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No signups yet</div>)}
        {stats.recentSignups.map((u: any, i: number) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{u.email}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Joined {new Date(u.joined).toLocaleDateString()}{u.trialEnd && u.status === 'Trial' && ` · Trial ends ${new Date(u.trialEnd).toLocaleDateString()}`}</div>
            </div>
            <span style={{ background: u.status === 'Pro' ? '#ECFDF5' : u.status === 'Trial' ? '#FFFBEB' : '#F9FAFB', color: u.status === 'Pro' ? '#065F46' : u.status === 'Trial' ? '#92400E' : '#6B7280', border: `1px solid ${u.status === 'Pro' ? '#6EE7B7' : u.status === 'Trial' ? '#FDE68A' : '#E5E7EB'}`, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px', whiteSpace: 'nowrap' as const }}>{u.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'tool' | 'admin'>('tool')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpgrade() {
    const res = await fetch('/api/checkout', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isAdmin = ADMIN_EMAIL && user?.email === ADMIN_EMAIL
  const isSubscribed = profile?.stripe_status === 'active'
  const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null
  const isOnTrial = trialEnd && trialEnd > new Date()
  const hasAccess = isAdmin || isSubscribed || isOnTrial
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0

  if (loading) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading…</div>)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <nav style={{ background: '#111827', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 18, color: '#F9FAFB', textDecoration: 'none' }}>Deal<span style={{ color: '#10B981' }}>Desk</span></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (<button onClick={() => setView(view === 'admin' ? 'tool' : 'admin')} style={{ background: view === 'admin' ? '#10B981' : '#1F2937', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{view === 'admin' ? '← Back to Tool' : '📊 Admin'}</button>)}
          {isOnTrial && !isSubscribed && !isAdmin && (<span style={{ fontSize: 12, color: '#FCD34D' }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>)}
          {!isSubscribed && !isAdmin && (<button onClick={handleUpgrade} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upgrade to Pro</button>)}
          {isSubscribed && !isAdmin && (<span style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>✓ Pro</span>)}
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #374151', color: '#9CA3AF', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>
      {!hasAccess && (<div style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', padding: '12px 20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><span style={{ fontSize: 14, color: '#991B1B', fontWeight: 600 }}>Your free trial has ended.</span><button onClick={handleUpgrade} style={{ background: '#991B1B', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Upgrade — $67/month</button></div>)}
      {params.get('upgraded') === 'true' && (<div style={{ background: '#ECFDF5', borderBottom: '1px solid #6EE7B7', padding: '12px 20px', textAlign: 'center', fontSize: 14, color: '#065F46', fontWeight: 600 }}>Welcome to Pro! Unlimited analyses unlocked.</div>)}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px 60px' }}>
        {view === 'admin' && isAdmin ? (<AdminPanel />) : hasAccess ? (<Underwriter />) : (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Trial ended</h2>
            <p style={{ color: '#6B7280', marginBottom: 24 }}>Upgrade to Pro for unlimited analyses.</p>
            <button onClick={handleUpgrade} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Upgrade to Pro — $67/month</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (<Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading…</div>}><DashboardContent /></Suspense>)
}
