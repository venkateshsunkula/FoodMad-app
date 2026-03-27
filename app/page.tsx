'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from './lib/supabase'
import LogMeal from './log'
import AddVendor from './add-vendor'
import CityPicker from './city-picker'
import BottomNav from './components/bottom-nav'

export default function Home() {
  const router = useRouter()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [logPreSelected, setLogPreSelected] = useState<any | null>(null)

  // Auth state
  const [authUser, setAuthUser] = useState<any>(null)   // Supabase auth user
  const [dbUser, setDbUser] = useState<any>(null)        // our users table record
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [pendingAction, setPendingAction] = useState<'log' | 'add-vendor' | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [pwaSignInOpen, setPwaSignInOpen] = useState(false)

  // GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 17.385, lng: 78.4867 })
      )
    }
  }, [])

  useEffect(() => { fetchVendors() }, [])

  // Auth — get session on load + listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) loadDbUser(session.user)
      else checkCookieSession() // iOS PWA: check if Safari completed OAuth
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) loadDbUser(session.user)
      else setDbUser(null)
    })

    // When user returns to PWA after signing in via Safari, pick up the session
    const onFocus = () => { if (!authUser) checkCookieSession() }
    document.addEventListener('visibilitychange', onFocus)

    return () => { subscription.unsubscribe(); document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  async function checkCookieSession() {
    const match = document.cookie.match(/foodmad_rt=([^;]+)/)
    if (!match) return
    const { data } = await supabase.auth.refreshSession({ refresh_token: decodeURIComponent(match[1]) })
    if (data.session) {
      setAuthUser(data.session.user)
      loadDbUser(data.session.user)
      // Clear the cookie — session is now in localStorage
      document.cookie = 'foodmad_rt=; path=/; max-age=0'
    }
  }

  async function loadDbUser(authUser: any) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (data) {
      setDbUser(data)
      // If user exists but never picked a city, show city picker
      if (!data.city) setShowCityPicker(true)
    } else {
      // New user — record was auto-created by DB trigger, but city is empty
      setShowCityPicker(true)
    }
  }

  async function handleCitySelect(city: string) {
    if (!authUser) return
    await supabase.from('users').update({ city }).eq('id', authUser.id)
    setDbUser((prev: any) => ({ ...prev, city }))
    setShowCityPicker(false)
    // If they were trying to do something before signing in, do it now
    if (pendingAction === 'log') { setPendingAction(null); setShowLog(true) }
    else if (pendingAction === 'add-vendor') { setPendingAction(null); setShowAddVendor(true) }
    else setPendingAction(null)
  }

  async function handleSignIn() {
    setSigningIn(true)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      // iOS PWA: Google blocks OAuth inside WKWebView — get the URL and open in Safari
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?pwa=1`, skipBrowserRedirect: true },
      })
      if (data?.url) window.open(data.url, '_blank')
      setSigningIn(false)
      setPwaSignInOpen(true) // show "return to app" hint
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    }
  }

  // Call before any gated action. Returns true if signed in.
  function requireAuth(action: 'log' | 'add-vendor'): boolean {
    if (authUser) return true
    setPendingAction(action)
    setShowActionMenu(false)
    setShowSignInPrompt(true)
    return false
  }

  async function fetchVendors() {
    const { data, error } = await supabase.from('vendors').select('*')
    if (error) console.error('Error fetching vendors:', error)
    else if (data) setVendors(data)
  }

  function handleVendorAdded(newVendor: any) {
    setVendors(prev => [...prev, newVendor])
    setShowAddVendor(false)
    setLogPreSelected(newVendor)
    setShowLog(true)
  }

  const mapCenter = userLocation ?? { lat: 17.385, lng: 78.4867 }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>

      {/* Map — inside APIProvider */}
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={15}
          mapId="foodmad-map"
          style={{ width: '100%', height: '100%' }}
          onClick={() => { setSelectedVendor(null); setShowActionMenu(false) }}
        >
          {vendors.filter(v => v.lat && v.lng).map((vendor) => (
            <AdvancedMarker
              key={vendor.id}
              position={{ lat: vendor.lat, lng: vendor.lng }}
              onClick={() => { setSelectedVendor(vendor); setShowActionMenu(false) }}
            >
              <Pin
                background={vendor.source === 'manual' ? '#F59E0B' : '#9CA3AF'}
                borderColor={vendor.source === 'manual' ? '#D97706' : '#6B7280'}
                glyphColor="#FFFFFF"
              />
            </AdvancedMarker>
          ))}
        </Map>

        {/* Add vendor needs to be inside APIProvider for useMapsLibrary */}
        {showAddVendor && (
          <AddVendor
            vendors={vendors}
            userLocation={userLocation ?? { lat: 17.385, lng: 78.4867 }}
            userId={authUser?.id}
            onClose={() => setShowAddVendor(false)}
            onVendorAdded={handleVendorAdded}
          />
        )}
      </APIProvider>

      {/* Sign-in / avatar button — top right with safe area */}
      <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, zIndex: 100 }}>
        {authUser ? (
          <button
            onClick={() => router.push('/profile')}
            title="Profile"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '2px solid #F59E0B', padding: 0,
              overflow: 'hidden', cursor: 'pointer', background: '#333',
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ color: 'white', fontSize: 18, position: 'absolute' }}>
              {(authUser.user_metadata?.full_name || authUser.email || '?')[0].toUpperCase()}
            </span>
            {authUser.user_metadata?.avatar_url && (
              <img
                src={authUser.user_metadata.avatar_url}
                alt=""
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
              />
            )}
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              padding: '10px 18px', borderRadius: 24,
              border: '1px solid #F59E0B',
              background: signingIn ? '#F59E0B' : 'rgba(10,10,10,0.85)',
              color: signingIn ? '#000' : '#F59E0B',
              fontSize: 14, fontWeight: 700, cursor: signingIn ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
            }}
          >
            {signingIn ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Signing in…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="#F59E0B"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Sign in
              </>
            )}
          </button>
        )}
      </div>

      {/* PWA sign-in hint — shown after opening Safari for OAuth */}
      {pwaSignInOpen && !authUser && (
        <div style={{ position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 200 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #F59E0B', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>↩</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'white' }}>Finish sign-in in Safari</p>
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Then come back here — you'll be signed in automatically</p>
            </div>
            <button onClick={() => { setPwaSignInOpen(false); checkCookieSession() }} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: 0 }}>✕</button>
          </div>
        </div>
      )}

      {/* Vendor popup */}
      {selectedVendor && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          left: 16,
          right: 16,
          background: '#1a1a1a',
          color: 'white',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{selectedVendor.name}</h3>
            <span style={{
              background: selectedVendor.source === 'manual' ? '#F59E0B' : '#6B7280',
              color: 'black',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {selectedVendor.source === 'manual' ? 'Vendor' : 'Restaurant'}
            </span>
          </div>
          <p style={{ margin: '8px 0 4px', color: '#9CA3AF', fontSize: 14 }}>
            {selectedVendor.type?.replace('_', ' ')} • {selectedVendor.hours}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {selectedVendor.cuisine_tags?.map((tag: string) => (
              <span key={tag} style={{
                background: '#333',
                padding: '4px 10px',
                borderRadius: 16,
                fontSize: 12,
                color: '#E5E7EB',
              }}>
                {tag}
              </span>
            ))}
          </div>
          <Link
            href={`/vendor/${selectedVendor.id}`}
            style={{
              display: 'block', marginTop: 14,
              padding: '10px 0', borderRadius: 8,
              background: '#F59E0B', color: 'black',
              textAlign: 'center', fontSize: 14, fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            View details →
          </Link>
        </div>
      )}

      {/* Action menu */}
      {showActionMenu && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 201,
          minWidth: 180,
        }}>
          <button
            onClick={() => {
              setShowActionMenu(false)
              if (requireAuth('log')) { setLogPreSelected(null); setShowLog(true) }
            }}
            style={{
              display: 'block', width: '100%', padding: '14px 20px',
              background: 'none', border: 'none', borderBottom: '1px solid #222',
              color: 'white', fontSize: 15, textAlign: 'left', cursor: 'pointer',
            }}
          >
            🍽️ Log a meal
          </button>
          <button
            onClick={() => {
              setShowActionMenu(false)
              if (requireAuth('add-vendor')) setShowAddVendor(true)
            }}
            style={{
              display: 'block', width: '100%', padding: '14px 20px',
              background: 'none', border: 'none',
              color: 'white', fontSize: 15, textAlign: 'left', cursor: 'pointer',
            }}
          >
            📍 Add new vendor
          </button>
        </div>
      )}

      <BottomNav
        activePage="map"
        onPlusClick={() => { setSelectedVendor(null); setShowActionMenu(prev => !prev) }}
      />

      {/* Sign-in prompt */}
      {showSignInPrompt && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1500, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowSignInPrompt(false)}
        >
          <div
            style={{ width: '100%', background: '#1a1a1a', borderRadius: '16px 16px 0 0', padding: '28px 24px 44px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 20, color: 'white' }}>Sign in to continue</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#9CA3AF' }}>
              {pendingAction === 'log'
                ? 'Sign in to log your meal and build your food diary.'
                : 'Sign in to pin new vendors and earn Discoverer credit.'}
            </p>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                width: '100%', padding: '15px 14px', borderRadius: 12,
                border: 'none', background: signingIn ? '#e8e8e8' : 'white',
                color: '#111', fontSize: 15, fontWeight: 700, cursor: signingIn ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'transform 0.1s, box-shadow 0.1s',
                boxShadow: signingIn ? 'none' : '0 2px 12px rgba(0,0,0,0.3)',
                transform: signingIn ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {signingIn ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2px solid #999', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
            <button
              onClick={() => setShowSignInPrompt(false)}
              style={{
                width: '100%', padding: 13, marginTop: 10,
                borderRadius: 12, border: '1px solid #222',
                background: 'transparent', color: '#6B7280', fontSize: 14, cursor: 'pointer',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Log meal overlay */}
      {showLog && (
        <LogMeal
          vendors={vendors}
          preSelectedVendor={logPreSelected ?? undefined}
          userId={authUser?.id}
          onClose={() => { setShowLog(false); setLogPreSelected(null); fetchVendors() }}
        />
      )}

      {/* City picker — shown once after first sign-in */}
      {showCityPicker && (
        <CityPicker onSelect={handleCitySelect} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
