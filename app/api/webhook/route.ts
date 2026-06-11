import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  const admin = createAdminSupabase()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata?.user_id
    if (userId) {
      await admin.from('profiles').upsert({
        id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_status: 'active',
      })
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any
    const { data: profile } = await admin.from('profiles').select('id').eq('stripe_customer_id', sub.customer).single()
    if (profile) {
      await admin.from('profiles').update({ stripe_status: sub.status }).eq('id', profile.id)
    }
  }

  return NextResponse.json({ received: true })
}
