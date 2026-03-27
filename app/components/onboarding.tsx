'use client'

import { useState } from 'react'

const SLIDES = [
  {
    emoji: '🗺️',
    title: 'Discover the unmapped',
    body: 'Find street vendors that don\'t exist on Google Maps — chaatwalas, momo stalls, and hidden gems right in your neighborhood.',
    accent: '#F59E0B',
  },
  {
    emoji: '🍽️',
    title: 'Log in under 30 seconds',
    body: 'Photo, rating, tags. No paragraphs, no reviews. Just capture what you ate and keep moving.',
    accent: '#F59E0B',
  },
  {
    emoji: '📍',
    title: 'Map what\'s missing',
    body: 'Pin new street vendors to the map. Earn permanent Discoverer credit. Help build India\'s street food database — together.',
    accent: '#F59E0B',
  },
]

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0)
  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  function next() {
    if (isLast) {
      localStorage.setItem('foodmad_onboarded', '1')
      onDone()
    } else {
      setSlide(s => s + 1)
    }
  }

  function skip() {
    localStorage.setItem('foodmad_onboarded', '1')
    onDone()
  }

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

        {/* Emoji illustration */}
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

        <h1 style={{
          margin: '0 0 16px', fontSize: 28, fontWeight: 800,
          fontStyle: 'italic', color: 'white', lineHeight: 1.2,
        }}>
          {current.title}
        </h1>

        <p style={{
          margin: 0, fontSize: 16, color: '#9CA3AF',
          lineHeight: 1.65,
        }}>
          {current.body}
        </p>
      </div>

      {/* Bottom: dots + button */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? 24 : 8,
                height: 8, borderRadius: 4,
                background: i === slide ? '#F59E0B' : '#333',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* CTA button */}
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
          {isLast ? 'Start Exploring 🍽️' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
