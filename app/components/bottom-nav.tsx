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

  const active = '#d4692f'
  const inactive = '#555555'

  return (
    <>
      <style>{`
        .nav-tab { transition: color 0.15s ease; }
        .nav-tab:active { opacity: 0.7; }
        .log-fab { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .log-fab:active { transform: scale(0.92) translateY(1px) !important; }
      `}</style>

      {/* Floating log button */}
      <button
        className="log-fab"
        onClick={handlePlusClick}
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          right: 20,
          zIndex: 201,
          width: 52, height: 52,
          borderRadius: 16,
          background: plusPressed ? '#bf5a28' : '#d4692f',
          border: 'none',
          boxShadow: plusPressed ? 'none' : '0 4px 20px rgba(212,105,47,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Tab bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 200,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#131210',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Link href="/" className="nav-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '8px 0', color: activePage === 'home' ? active : inactive }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill={activePage === 'home' ? active : 'none'} stroke={activePage === 'home' ? active : inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>Home</span>
        </Link>

        <Link href="/map" className="nav-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '8px 0', color: activePage === 'map' ? active : inactive }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={activePage === 'map' ? active : inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>Discover</span>
        </Link>

        <Link href="/search" className="nav-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '8px 0', color: activePage === 'search' ? active : inactive }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={activePage === 'search' ? active : inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>Search</span>
        </Link>

        <Link href="/profile" className="nav-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '8px 0', color: activePage === 'profile' ? active : inactive }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill={activePage === 'profile' ? active : 'none'} stroke={activePage === 'profile' ? active : inactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>Profile</span>
        </Link>
      </nav>
    </>
  )
}
