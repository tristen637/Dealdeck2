import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminSupabase } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
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

    if (!isAdmin) {
      const admin = createAdminSupabase()
      const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
      const isSubscribed = profile?.stripe_status === 'active'
      const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null
      const isOnTrial = trialEnd && trialEnd > new Date()

      if (!isSubscribed && !isOnTrial) {
        return NextResponse.json({ error: 'subscription_required' }, { status: 403 })
      }

      if (isOnTrial && !isSubscribed) {
        const { count } = await admin.from('analyses').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if ((count ?? 0) >= 5) {
          return NextResponse.json({ error: 'trial_limit_reached' }, { status: 403 })
        }
      }

      const admin2 = createAdminSupabase()
      await admin2.from('analyses').insert({ user_id: user.id, created_at: new Date().toISOString() })
    }

    const { messages } = await req.json()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages,
    })

    return NextResponse.json({ content: response.content })
  } catch (err: any) {
    console.error('Underwrite error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
