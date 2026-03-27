'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Supabase will detect the session from the URL hash automatically.
    // Wait for auth state to settle then redirect home.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace('/')
      }
    })

    // Fallback: if already signed in or no event fires within 3s, go home anyway
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/')
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

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
