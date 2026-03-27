'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SLIDES = [
  {
    emoji: '🗺️',
    title: 'Discover the unmapped',
    body: 'Find street vendors that don\'t exist on Google Maps — chaatwalas, momo stalls, and hidden gems right in your neighborhood.',
  },
  {
    emoji: '🍽️',
    title: 'Log in under 30 seconds',
    body: 'Photo, rating, tags. No paragraphs, no reviews. Just capture what you ate and keep moving.',
  },
  {
    emoji: '📍',
    title: 'Map what\'s missing',
    body: 'Pin new street vendors to the map. Earn permanent Discoverer credit. Help build India\'s street food database — together.',
  },
]

const CITIES = [
  'Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Visakhapatnam', 'Kochi',
  'Chandigarh', 'Lucknow', 'Jaipur', 'Surat', 'Coimbatore',
]

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  function next() {
    if (isLast) {
      setShowCityPicker(true)
    } else {
      setSlide(s => s + 1)
    }
  }

  function skip() {
    localStorage.setItem('foodmad_onboarded', '1')
    onDone()
  }

  async function finish() {
    setSaving(true)
    localStorage.setItem('foodmad_onboarded', '1')
    if (city) localStorage.setItem('foodmad_city', city)

    const { data: { user } } = await supabase.auth.getUser()
    if (user && city) {
      await supabase.from('users').update({ city }).eq('id', user.id)
    }

    // Request browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    setSaving(false)
    onDone()
  }

  // ── City picker step ──
  if (showCityPicker) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top, 0px) + 40px) 24px calc(env(safe-area-inset-bottom, 0px) + 32px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#F59E0B', textTransform: 'uppercase' }}>
            One last thing
          </p>
          <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: 'white' }}>
            Where are you eating?
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
            We'll show you what's trending near you
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, alignContent: 'start' }}>
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              style={{
                padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                border: city === c ? '2px solid #F59E0B' : '1px solid #252525',
                background: city === c ? 'rgba(245,158,11,0.1)' : '#141414',
                color: city === c ? '#F59E0B' : '#9CA3AF',
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
            We'll also ask for notifications so you don't miss follows &amp; activity.
          </p>
          <button
            onClick={finish}
            disabled={!city || saving}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
              background: city ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#1a1a1a',
              color: city ? 'black' : '#444',
              fontSize: 16, fontWeight: 800,
              cursor: city && !saving ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: city ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
            }}
          >
            {saving ? 'Setting up…' : city ? `Explore ${city} 🍽️` : 'Pick a city to continue'}
          </button>
          <button
            onClick={skip}
            style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // ── Slide carousel ──
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: 'calc(env(safe-area-inset-top, 0px) + 40px) 32px calc(env(safe-area-inset-bottom, 0px) + 40px)',
    }}>

      {/* Skip button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        {!isLast && (
          <button onClick={skip} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: 340 }}>
        <div style={{
          width: 120, height: 120, borderRadius: 32,
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56, marginBottom: 36,
          boxShadow: '0 0 40px rgba(245,158,11,0.1)',
        }}>
          {current.emoji}
        </div>

        <h1 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 800, fontStyle: 'italic', color: 'white', lineHeight: 1.2 }}>
          {current.title}
        </h1>

        <p style={{ margin: 0, fontSize: 16, color: '#9CA3AF', lineHeight: 1.65 }}>
          {current.body}
        </p>
      </div>

      {/* Bottom: dots + button */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 8, height: 8, borderRadius: 4,
                background: i === slide ? '#F59E0B' : '#333',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          style={{
            width: '100%', padding: '16px 0',
            borderRadius: 14, border: 'none',
            background: '#F59E0B', color: 'black',
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
          }}
        >
          {isLast ? 'Pick my city →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
