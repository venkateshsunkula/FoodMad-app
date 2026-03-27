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

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-item { transition: transform 0.15s ease, opacity 0.15s ease; }
        .nav-item:active { transform: scale(0.85); opacity: 0.7; }
        .nav-dot { transition: all 0.25s ease; }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Frosted glass bar */}
        <div style={{
          margin: '0 12px 10px',
          background: 'rgba(18,18,18,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          padding: '8px 4px',
          minHeight: 60,
        }}>

          {/* Home */}
          <Link href="/" className="nav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', position: 'relative', padding: '4px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: activePage === 'home' ? 'rgba(245,158,11,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'home' ? '#F59E0B' : '#6B7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: activePage === 'home' ? 700 : 500, color: activePage === 'home' ? '#F59E0B' : '#6B7280', letterSpacing: '0.02em' }}>Home</span>
            <div className="nav-dot" style={{ width: activePage === 'home' ? 4 : 0, height: 4, borderRadius: 2, background: '#F59E0B', position: 'absolute', bottom: -2 }} />
          </Link>

          {/* Map */}
          <Link href="/map" className="nav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', position: 'relative', padding: '4px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: activePage === 'map' ? 'rgba(245,158,11,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'map' ? '#F59E0B' : '#6B7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/>
                <line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: activePage === 'map' ? 700 : 500, color: activePage === 'map' ? '#F59E0B' : '#6B7280', letterSpacing: '0.02em' }}>Map</span>
            <div className="nav-dot" style={{ width: activePage === 'map' ? 4 : 0, height: 4, borderRadius: 2, background: '#F59E0B', position: 'absolute', bottom: -2 }} />
          </Link>

          {/* Log — center action button */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handlePlusClick}
              style={{
                width: 52, height: 52,
                borderRadius: 18,
                background: plusPressed
                  ? '#D97706'
                  : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                border: 'none',
                boxShadow: plusPressed
                  ? '0 2px 8px rgba(245,158,11,0.3)'
                  : '0 4px 16px rgba(245,158,11,0.45), 0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transform: plusPressed ? 'scale(0.92)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <Link href="/search" className="nav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', position: 'relative', padding: '4px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: activePage === 'search' ? 'rgba(245,158,11,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'search' ? '#F59E0B' : '#6B7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: activePage === 'search' ? 700 : 500, color: activePage === 'search' ? '#F59E0B' : '#6B7280', letterSpacing: '0.02em' }}>Search</span>
            <div className="nav-dot" style={{ width: activePage === 'search' ? 4 : 0, height: 4, borderRadius: 2, background: '#F59E0B', position: 'absolute', bottom: -2 }} />
          </Link>

          {/* Profile */}
          <Link href="/profile" className="nav-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', position: 'relative', padding: '4px 0' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: activePage === 'profile' ? 'rgba(245,158,11,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activePage === 'profile' ? '#F59E0B' : '#6B7280'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: activePage === 'profile' ? 700 : 500, color: activePage === 'profile' ? '#F59E0B' : '#6B7280', letterSpacing: '0.02em' }}>Profile</span>
            <div className="nav-dot" style={{ width: activePage === 'profile' ? 4 : 0, height: 4, borderRadius: 2, background: '#F59E0B', position: 'absolute', bottom: -2 }} />
          </Link>

        </div>
      </div>
    </>
  )
}
