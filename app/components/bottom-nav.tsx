'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function BottomNav({
  activePage,
  onPlusClick,
}: {
  activePage: 'home' | 'map' | 'search' | 'feed' | 'profile'
  onPlusClick: () => void
}) {
  const [plusPressed, setPlusPressed] = useState(false)

  function handlePlusClick() {
    setPlusPressed(true)
    setTimeout(() => setPlusPressed(false), 200)
    onPlusClick()
  }

  const activeColor = '#1B4F3C'
  const inactiveColor = 'rgba(249,249,249,0.4)'
  const barBg = '#1A1C1C'

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 200,
      height: 'calc(72px + env(safe-area-inset-bottom))',
      background: barBg,
      borderTop: '1px solid rgba(27,79,60,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 16,
      paddingRight: 16,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
    }}>
      <style>{`
        .enav-item { transition: transform 0.15s ease, opacity 0.15s ease; }
        .enav-item:active { transform: translateY(-1px); }
      `}</style>

      {/* Discover (Map) */}
      <Link href="/map" className="enav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
        <span style={{ fontSize: 22, lineHeight: 1, fontFamily: 'Material Symbols Outlined', color: activePage === 'map' ? activeColor : inactiveColor }}>
          explore
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: activePage === 'map' ? activeColor : inactiveColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
          Discover
        </span>
      </Link>

      {/* Feed / Journal */}
      <Link href="/" className="enav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'home' ? activeColor : inactiveColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 10h16M4 14h10"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: activePage === 'home' ? activeColor : inactiveColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
          Journal
        </span>
      </Link>

      {/* Log — center action */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handlePlusClick}
          style={{
            width: 52, height: 52,
            borderRadius: 4,
            background: plusPressed ? '#003827' : '#1B4F3C',
            border: 'none',
            boxShadow: plusPressed ? '0 2px 8px rgba(27,79,60,0.3)' : '0 4px 16px rgba(27,79,60,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transform: plusPressed ? 'scale(0.92) translateY(1px)' : 'scale(1)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <Link href="/search" className="enav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'search' ? activeColor : inactiveColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: activePage === 'search' ? activeColor : inactiveColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
          Search
        </span>
      </Link>

      {/* Profile */}
      <Link href="/profile" className="enav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', padding: '4px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'profile' ? activeColor : inactiveColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: activePage === 'profile' ? activeColor : inactiveColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
          Profile
        </span>
      </Link>
    </nav>
  )
}
