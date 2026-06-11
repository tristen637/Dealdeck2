'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [isSignup, setIsSignup] = useState(params.get('signup') === 'true')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/dashboard' }
      })
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account, then log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const inp = { width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' } as const

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <a href="/" style={{ fontWeight: 800, fontSize: 24, color: '#111827', textDecoration: 'none', marginBottom: 32 }}>
        Deal<span style={{ color: '#10B981' }}>Desk</span>
      </a>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
          {isSignup ? 'Start your 7-day free trial — no credit card required' : 'Log in to DealDesk'}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="min 6 characters" minLength={6} style={inp} />
          </div>
          {error && <div style={{ background: '#FEF2F2', color: '#991B1B', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ background: '#ECFDF5', color: '#065F46', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{success}</div>}
          <button type="submit" disabled={loading} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Loading…' : isSignup ? 'Start Free Trial' : 'Log In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 20 }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsSignup(!isSignup); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {isSignup ? 'Log in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}><AuthForm /></Suspense>
}
