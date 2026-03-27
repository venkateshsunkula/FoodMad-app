'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from './lib/supabase'
import BottomNav from './components/bottom-nav'
import Onboarding from './components/onboarding'

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function Home() {
  const router = useRouter()
  const [trending, setTrending] = useState<any[]>([])
  const [recentBites, setRecentBites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [city, setCity] = useState('')
  const [authUser, setAuthUser] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  useEffect(() => {
    if (!localStorage.getItem('foodmad_onboarded')) setShowOnboarding(true)
    setCity(localStorage.getItem('foodmad_city') ?? '')
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      if (user) fetchUnreadCount(user.id)
    })
    loadData()
  }, [])

  async function fetchUnreadCount(userId: string) {
    const { count } = await supabase
      .from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false)
    setUnreadCount(count ?? 0)
  }

  const loadData = useCallback(async () => {
    const [{ data: logs }, { data: vendorLogs }] = await Promise.all([
      // Recent bites: latest meal logs from all users
      supabase
        .from('meal_logs')
        .select('id, dish_name, rating, photo_url, price_inr, tags, note, logged_at, vendor_id, vendors(id, name, city), users!user_id(id, name, avatar_url)')
        .order('logged_at', { ascending: false })
        .limit(30),
      // For trending: fetch logs with vendor info for aggregation
      supabase
        .from('meal_logs')
        .select('vendor_id, rating, vendors(id, name, source, cuisine_tags, city, neighborhood, photo_url)')
        .not('rating', 'is', null)
        .not('vendor_id', 'is', null)
        .limit(600),
    ])

    setRecentBites(logs ?? [])

    // Aggregate trending vendors
    const map: Record<string, { ratings: number[]; vendor: any }> = {}
    for (const log of vendorLogs ?? []) {
      if (!log.vendor_id || !log.vendors) continue
      if (!map[log.vendor_id]) map[log.vendor_id] = { ratings: [], vendor: log.vendors }
      map[log.vendor_id].ratings.push(log.rating ?? 0)
    }
    const trendingList = Object.values(map)
      .filter(v => v.ratings.length >= 1)
      .map(v => ({
        ...v.vendor,
        avgRating: (v.ratings.reduce((a: number, b: number) => a + b, 0) / v.ratings.length).toFixed(1),
        logCount: v.ratings.length,
      }))
      .sort((a: any, b: any) => parseFloat(b.avgRating) - parseFloat(a.avgRating) || b.logCount - a.logCount)
      .slice(0, 8)
    setTrending(trendingList)
    setLoading(false)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1a1a1a',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: '#F59E0B', letterSpacing: '-0.5px', lineHeight: 1 }}>
              foodmad
            </h1>
            {city && (
              <button
                onClick={() => router.push('/map')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{city}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ width: 36, height: 36, borderRadius: 12, background: '#1a1a1a', border: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={refreshing ? '#F59E0B' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>

            {/* Notifications */}
            {authUser && (
              <Link href="/notifications" style={{ position: 'relative', textDecoration: 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#1a1a1a', border: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                {unreadCount > 0 && (
                  <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', border: '2px solid #0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', padding: '0 3px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </Link>
            )}

            {/* Avatar / Sign in */}
            {authUser ? (
              <Link href="/profile">
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#333', border: '2px solid #F59E0B', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span style={{ color: 'white', fontSize: 15, position: 'absolute' }}>
                    {(authUser.user_metadata?.full_name || authUser.email || '?')[0].toUpperCase()}
                  </span>
                  {authUser.user_metadata?.avatar_url && (
                    <img src={authUser.user_metadata.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  )}
                </div>
              </Link>
            ) : (
              <Link href="/map" style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #F59E0B', color: '#F59E0B', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 0' }}>

        {/* Trending near you */}
        {trending.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                ⭐ Trending near you
              </p>
              <Link href="/map" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', fontWeight: 600 }}>
                See on map →
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
              {trending.map((v, i) => (
                <Link key={v.id} href={`/vendor/${v.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: 160, background: '#141414', border: '1px solid #252525', borderRadius: 18, overflow: 'hidden' }}>
                    {/* Photo or placeholder */}
                    <div style={{ height: 110, background: '#252525', position: 'relative' }}>
                      {v.photo_url
                        ? <img src={v.photo_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                            {v.source === 'manual' ? '🛺' : '🍴'}
                          </div>
                      }
                      {/* Rank badge */}
                      <div style={{ position: 'absolute', top: 8, left: 8, background: i < 3 ? '#F59E0B' : 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800, color: i < 3 ? 'black' : '#F59E0B' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      {v.source === 'manual' && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(245,158,11,0.9)', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 800, color: 'black' }}>
                          STREET
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.neighborhood || v.city || v.type?.replace(/_/g, ' ')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>★ {v.avgRating}</span>
                        <span style={{ fontSize: 10, color: '#6B7280' }}>{v.logCount} logs</span>
                      </div>
                      {v.cuisine_tags?.length > 0 && (
                        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#F59E0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.cuisine_tags.slice(0, 2).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent bites */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
              🍽️ Recent bites
            </p>
            <Link href="/feed" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none', fontWeight: 600 }}>
              Following →
            </Link>
          </div>

          {recentBites.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 32px' }}>
              <p style={{ fontSize: 52, margin: '0 0 16px' }}>🌮</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
                No bites logged yet
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: '0 0 28px' }}>
                Be the first to discover street food in your area.<br />Log what you ate in under 30 seconds.
              </p>
              <button
                onClick={() => router.push('/map?log=1')}
                style={{ padding: '14px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'black', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
              >
                🍽️ Log your first meal
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentBites.map(log => {
              const vendor = log.vendors as any
              const user = log.users as any
              return (
                <div key={log.id} onClick={() => setSelectedLog(log)} style={{ borderBottom: '1px solid #111', padding: '16px 20px', cursor: 'pointer' }}>
                  {/* User row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#252525', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ color: '#9CA3AF', fontSize: 13, position: 'absolute' }}>{(user?.name || '?')[0]?.toUpperCase()}</span>
                      {user?.avatar_url && (
                        <img src={user.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {user?.name ? (
                        <Link href={`/user/${user.id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>{user.name}</p>
                        </Link>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Anonymous</p>
                      )}
                      <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{timeAgo(log.logged_at)}</p>
                    </div>
                    <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}</span>
                  </div>

                  {/* Photo */}
                  {log.photo_url && (
                    <img src={log.photo_url} alt={log.dish_name} style={{ width: '100%', borderRadius: 14, maxHeight: 280, objectFit: 'cover', display: 'block', marginBottom: 12 }} />
                  )}

                  {/* Dish + vendor */}
                  <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>{log.dish_name}</p>
                  {vendor && (
                    <Link href={`/vendor/${vendor.id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>@ {vendor.name}</p>
                    </Link>
                  )}

                  {/* Price + tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {log.price_inr && (
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>₹{log.price_inr}</span>
                    )}
                    {log.tags?.map((tag: string) => (
                      <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', padding: '3px 8px', borderRadius: 10, fontSize: 11, color: '#9CA3AF' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Log detail sheet */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setSelectedLog(null)}>
          <div style={{ width: '100%', background: '#111', borderRadius: '20px 20px 0 0', padding: '20px 20px 48px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            {selectedLog.photo_url && (
              <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 14, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontStyle: 'italic' }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}</span>
            </div>
            {(selectedLog.vendors as any)?.name && (
              <Link href={`/vendor/${selectedLog.vendor_id}`} style={{ textDecoration: 'none' }}>
                <p style={{ margin: '0 0 6px', color: '#F59E0B', fontSize: 14, fontWeight: 600 }}>@ {(selectedLog.vendors as any).name}</p>
              </Link>
            )}
            {selectedLog.price_inr && <p style={{ margin: '0 0 14px', color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>₹{selectedLog.price_inr}</p>}
            {selectedLog.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedLog.tags.map((tag: string) => (
                  <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#9CA3AF' }}>{tag}</span>
                ))}
              </div>
            )}
            {selectedLog.note && <p style={{ margin: '0 0 14px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>"{selectedLog.note}"</p>}
            <p style={{ margin: 0, color: '#444', fontSize: 12 }}>{new Date(selectedLog.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      {showOnboarding && <Onboarding onDone={() => { setShowOnboarding(false); setCity(localStorage.getItem('foodmad_city') ?? '') }} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="home" onPlusClick={() => router.push('/map?log=1')} />
    </div>
  )
}
