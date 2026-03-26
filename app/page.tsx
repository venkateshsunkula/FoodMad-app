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
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) loadDbUser(session.user)
      else { setDbUser(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
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

      {/* Sign-in / avatar button — top right */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        {authUser ? (
          <button
            onClick={() => router.push('/profile')}
            title="Profile"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              border: '2px solid #F59E0B', padding: 0,
              overflow: 'hidden', cursor: 'pointer', background: '#333',
            }}
          >
            {authUser.user_metadata?.avatar_url ? (
              <img src={authUser.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontSize: 16 }}>
                {(authUser.user_metadata?.full_name || authUser.email || '?')[0].toUpperCase()}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            style={{
              padding: '8px 14px', borderRadius: 20,
              border: '1px solid #F59E0B', background: 'transparent',
              color: '#F59E0B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        )}
      </div>

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
              style={{
                width: '100%', padding: 14, borderRadius: 10,
                border: 'none', background: 'white',
                color: '#111', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Continue with Google
            </button>
            <button
              onClick={() => setShowSignInPrompt(false)}
              style={{
                width: '100%', padding: 12, marginTop: 10,
                borderRadius: 10, border: 'none',
                background: 'transparent', color: '#9CA3AF', fontSize: 15, cursor: 'pointer',
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

    </div>
  )
}
