'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Suspense } from 'react'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPwa = searchParams.get('pwa') === '1'
  const [done, setDone] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()

        if (fromPwa) {
          // Store refresh token in a cookie so the PWA can pick it up
          const rt = encodeURIComponent(session.refresh_token)
          document.cookie = `foodmad_rt=${rt}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
          setDone(true) // show "go back to the app" screen
        } else {
          router.replace('/')
        }
      }
    })

    // Fallback: if no SIGNED_IN event in 4s, go home anyway
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      if (!fromPwa) router.replace('/')
      else setDone(true)
    }, 4000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [router, fromPwa])

  if (done) {
    return (
      <div style={{
        height: '100vh', background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, fontStyle: 'italic', margin: '0 0 10px' }}>
          You're signed in!
        </h2>
        <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
          Go back to the Foodmad app on your home screen — you'll be logged in automatically.
        </p>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 8 }}>
          📍
        </div>
        <p style={{ color: '#6B7280', fontSize: 12 }}>Foodmad</p>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #333', borderTopColor: '#F59E0B',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CallbackInner />
    </Suspense>
  )
}
