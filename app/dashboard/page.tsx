'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const Underwriter = dynamic(() => import('@/components/underwriter/Underwriter?v=2'), { ssr: false })

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

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Loading stats…</div>
  if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: '#991B1B' }}>Could not load stats</div>

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
        {stats.recentSignups.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No signups yet</div>}
        {stats.recentSignups.map((u: any, i: number) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827'
