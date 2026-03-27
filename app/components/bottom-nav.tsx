'use client'

import Link from 'next/link'

export default function BottomNav({
  activePage,
  onPlusClick,
}: {
  activePage: 'map' | 'search' | 'feed' | 'profile'
  onPlusClick: () => void
}) {
  const activeColor = '#F59E0B'
  const inactiveColor = '#6B7280'

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: '#111',
      borderTop: '1px solid #222',
      display: 'flex',
      alignItems: 'center',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
      minHeight: 60,
    }}>
      <Link href="/" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none' }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🗺️</span>
        <span style={{ fontSize: 10, color: activePage === 'map' ? activeColor : inactiveColor }}>Map</span>
      </Link>

      <Link href="/search" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none' }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🔍</span>
        <span style={{ fontSize: 10, color: activePage === 'search' ? activeColor : inactiveColor }}>Search</span>
      </Link>

      <button
        onClick={onPlusClick}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <span style={{ fontSize: 26, color: activeColor, fontWeight: 700, lineHeight: 1 }}>+</span>
        <span style={{ fontSize: 10, color: inactiveColor }}>Log</span>
      </button>

      <Link href="/feed" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none' }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>📰</span>
        <span style={{ fontSize: 10, color: activePage === 'feed' ? activeColor : inactiveColor }}>Feed</span>
      </Link>

      <Link href="/profile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none' }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>👤</span>
        <span style={{ fontSize: 10, color: activePage === 'profile' ? activeColor : inactiveColor }}>Profile</span>
      </Link>
    </div>
  )
}
