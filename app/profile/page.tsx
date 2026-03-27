'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

export default function ProfilePage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [vendorCount, setVendorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'diary'>('diary')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    setAuthUser(user)

    const [{ data: db }, { data: logs }, { count }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase
        .from('meal_logs')
        .select('*, vendors(name)')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false }),
      supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('added_by', user.id),
    ])

    setDbUser(db)
    setMealLogs(logs ?? [])
    setVendorCount(count ?? 0)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const uniqueDishes = new Set(mealLogs.map(l => l.dish_name?.toLowerCase())).size
  const avgRating = mealLogs.length
    ? (mealLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / mealLogs.length).toFixed(1)
    : null

  const avatarUrl = authUser?.user_metadata?.avatar_url
  const displayName = dbUser?.name || authUser?.user_metadata?.full_name || 'Anonymous'
  const initials = displayName[0]?.toUpperCase()

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: 22, cursor: 'pointer', padding: 0 }}
        >←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: '#F59E0B' }}>Profile</h1>
        <button
          onClick={handleSignOut}
          style={{ background: 'none', border: '1px solid #333', color: '#6B7280', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}
        >Sign out</button>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Avatar + name hero */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 0 28px' }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            {/* Glow behind avatar */}
            <div style={{
              position: 'absolute', inset: -8,
              background: '#F59E0B', borderRadius: '50%',
              filter: 'blur(20px)', opacity: 0.2,
            }} />
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              border: '2px solid #333', overflow: 'hidden',
              background: '#1a1a1a', position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 36, color: 'white', position: 'absolute' }}>{initials}</span>
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
              )}
            </div>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>
            {displayName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {dbUser?.city && (
              <span>📍 {dbUser.city}</span>
            )}
            {dbUser?.created_at && (
              <span>🗓 Joined {new Date(dbUser.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </section>

        {/* Stats bento grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Logs', value: mealLogs.length, icon: '🍽️' },
            { label: 'Discovered', value: vendorCount, icon: '📍' },
            { label: 'Dishes', value: uniqueDishes, icon: '🥘' },
            { label: 'Avg Rating', value: avgRating ? `${avgRating}★` : '—', icon: '⭐' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: '#1a1a1a',
                border: '1px solid #252525',
                borderRadius: 16,
                padding: '20px 18px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(245,158,11,0.04)',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                {stat.label}
              </p>
              <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>
                {stat.value}
              </h3>
              <span style={{
                position: 'absolute', bottom: -8, right: -4,
                fontSize: 56, opacity: 0.08, pointerEvents: 'none',
              }}>{stat.icon}</span>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: 24, borderBottom: '1px solid #1a1a1a', marginBottom: 20, paddingBottom: 0 }}>
          {['diary'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                paddingBottom: 12,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: activeTab === tab ? '#F59E0B' : '#6B7280',
                borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              Food Diary
            </button>
          ))}
        </nav>

        {/* Food diary grid */}
        {mealLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🍽️</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>No meals logged yet</p>
            <p style={{ fontSize: 13 }}>Tap + to log your first meal</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {mealLogs.map(log => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{
                  aspectRatio: '1',
                  background: '#1a1a1a',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid #252525',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {log.photo_url ? (
                  <img
                    src={log.photo_url}
                    alt={log.dish_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                    🍽️
                  </div>
                )}
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)',
                }} />
                {/* Text */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontStyle: 'italic', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.dish_name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {formatDate(log.logged_at)}
                  </p>
                </div>
                {/* Rating badge */}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  borderRadius: 6, padding: '2px 7px',
                  fontSize: 11, color: '#F59E0B', fontWeight: 700,
                }}>
                  {'★'.repeat(log.rating)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Meal detail bottom sheet */}
      {selectedLog && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              width: '100%', background: '#111',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 48px',
              maxHeight: '85vh', overflowY: 'auto',
              boxSizing: 'border-box',
              border: '1px solid #1a1a1a',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

            {selectedLog.photo_url && (
              <img
                src={selectedLog.photo_url}
                alt={selectedLog.dish_name}
                style={{ width: '100%', borderRadius: 14, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontStyle: 'italic' }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}
              </span>
            </div>

            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>
            {selectedLog.price_inr && (
              <p style={{ margin: '0 0 14px', color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>₹{selectedLog.price_inr}</p>
            )}

            {selectedLog.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedLog.tags.map((tag: string) => (
                  <span key={tag} style={{
                    background: '#1a1a1a', border: '1px solid #333',
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#9CA3AF',
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {selectedLog.note && (
              <p style={{ margin: '0 0 14px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{selectedLog.note}"
              </p>
            )}

            <p style={{ margin: 0, color: '#444', fontSize: 12 }}>
              {new Date(selectedLog.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <BottomNav activePage="profile" onPlusClick={() => router.push('/')} />
    </div>
  )
}
