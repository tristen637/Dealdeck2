import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: any) {
            try { cookiesToSet.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminSupabase()

    const { data: profiles } = await admin.from('profiles').select('*').order('created_at', { ascending: false })

    const now = new Date()
    const totalSignups = profiles?.length || 0
    const activeTrials = profiles?.filter(p => p.trial_end && new Date(p.trial_end) > now && p.stripe_status !== 'active').length || 0
    const paying = profiles?.filter(p => p.stripe_status === 'active').length || 0
    const expired = profiles?.filter(p => p.trial_end && new Date(p.trial_end) <= now && p.stripe_status !== 'active').length || 0

    const { count: totalAnalyses } = await admin.from('analyses').select('*', { count: 'exact', head: true })

    return NextResponse.json({
      totalSignups,
      activeTrials,
      paying,
      expired,
      totalAnalyses: totalAnalyses || 0,
      recentSignups: profiles?.slice(0, 20).map(p => ({
        email: p.email,
        status: p.stripe_status === 'active' ? 'Pro' : (p.trial_end && new Date(p.trial_end) > now ? 'Trial' : 'Expired'),
        joined: p.created_at,
        trialEnd: p.trial_end,
      })) || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
