'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

type Tab = 'following' | 'explore'

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

export default function FeedPage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('following')

  // Explore data
  const [trendingDishes, setTrendingDishes] = useState<any[]>([])
  const [newVendors, setNewVendors] = useState<any[]>([])
  const [topSpots, setTopSpots] = useState<any[]>([])
  const [exploreLoaded, setExploreLoaded] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUser(user)

    if (!user) { setLoading(false); return }

    const { data: following } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id)

    const followingIds = following?.map(f => f.following_id) ?? []

    if (followingIds.length > 0) {
      const { data } = await supabase
        .from('meal_logs')
        .select('*, vendors(id, name), users!user_id(id, name, avatar_url)')
        .in('user_id', followingIds)
        .order('logged_at', { ascending: false })
        .limit(60)
      setLogs(data ?? [])
    }

    setLoading(false)
  }

  async function loadExplore() {
    if (exploreLoaded) return
    setExploreLoaded(true)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: recentLogs }, { data: recentVendors }, { data: allLogs }] = await Promise.all([
      // Trending: recent logs for dish grouping
      supabase.from('meal_logs')
        .select('dish_name, photo_url, rating, vendor_id, vendors(id, name)')
        .gte('logged_at', sevenDaysAgo)
        .limit(200),
      // New vendors added in last 30 days
      supabase.from('vendors')
        .select('id, name, type, source, cuisine_tags, neighborhood, city, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(12),
      // Top spots: logs for rating computation
      supabase.from('meal_logs')
        .select('vendor_id, rating, vendors(id, name, cuisine_tags, source)')
        .not('rating', 'is', null)
        .limit(500),
    ])

    // Build trending dishes — group by dish name
    const dishMap: Record<string, { count: number; totalRating: number; photo: string | null; vendorName: string; vendorId: string }> = {}
    for (const log of recentLogs ?? []) {
      const key = log.dish_name?.toLowerCase()
      if (!key) continue
      if (!dishMap[key]) dishMap[key] = { count: 0, totalRating: 0, photo: null, vendorName: log.vendors?.name ?? '', vendorId: log.vendor_id }
      dishMap[key].count++
      dishMap[key].totalRating += log.rating ?? 0
      if (!dishMap[key].photo && log.photo_url) dishMap[key].photo = log.photo_url
    }
    const trending = Object.entries(dishMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data, avgRating: (data.totalRating / data.count).toFixed(1) }))
    setTrendingDishes(trending)

    setNewVendors(recentVendors ?? [])

    // Build top spots — group by vendor, min 3 logs
    const vendorMap: Record<string, { totalRating: number; count: number; vendor: any }> = {}
    for (const log of allLogs ?? []) {
      if (!log.vendor_id || !log.vendors) continue
      if (!vendorMap[log.vendor_id]) vendorMap[log.vendor_id] = { totalRating: 0, count: 0, vendor: log.vendors }
      vendorMap[log.vendor_id].totalRating += log.rating ?? 0
      vendorMap[log.vendor_id].count++
    }
    const spots = Object.values(vendorMap)
      .filter(v => v.count >= 2)
      .sort((a, b) => (b.totalRating / b.count) - (a.totalRating / a.count))
      .slice(0, 8)
      .map(v => ({ ...v.vendor, avgRating: (v.totalRating / v.count).toFixed(1), logCount: v.count }))
    setTopSpots(spots)
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'explore') loadExplore()
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
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 80 }}>

      {/* Header + tabs */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: '#F59E0B' }}>Feed</h1>
        </div>
        <div style={{ display: 'flex' }}>
          {([['following', 'Following'], ['explore', 'Explore']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => handleTabChange(key)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 0 12px', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tab === key ? '#F59E0B' : '#6B7280',
              borderBottom: tab === key ? '2px solid #F59E0B' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── FOLLOWING TAB ── */}
      {tab === 'following' && (
        <>
          {!authUser && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🍽️</p>
              <p style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 20 }}>Sign in to see what people around you are eating.</p>
              <button onClick={() => router.push('/')} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#F59E0B', color: 'black', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Go to map
              </button>
            </div>
          )}

          {authUser && logs.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>👋</p>
              <p style={{ color: 'white', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Your feed is empty</p>
              <p style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Follow people to see their meals here.</p>
              <button onClick={() => handleTabChange('explore')} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: '#F59E0B', color: 'black', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Explore instead →
              </button>
            </div>
          )}

          {logs.map(log => (
            <div key={log.id} style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Link href={`/user/${log.users?.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#333', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span style={{ color: 'white', fontSize: 14, position: 'absolute' }}>{(log.users?.name || '?')[0].toUpperCase()}</span>
                    {log.users?.avatar_url && <img src={log.users.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{log.users?.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{timeAgo(log.logged_at)}</p>
                  </div>
                </Link>
                <span style={{ color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>{'★'.repeat(log.rating)}</span>
              </div>
              {log.photo_url && (
                <img src={log.photo_url} alt={log.dish_name} onClick={() => setSelectedLog(log)} style={{ width: '100%', borderRadius: 10, maxHeight: 280, objectFit: 'cover', display: 'block', marginBottom: 12, cursor: 'pointer' }} />
              )}
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{log.dish_name}</p>
              {log.vendors && (
                <Link href={`/vendor/${log.vendors.id}`} style={{ textDecoration: 'none' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: '#F59E0B' }}>@ {log.vendors.name}</p>
                </Link>
              )}
              {log.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {log.tags.map((tag: string) => (
                    <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '3px 8px', borderRadius: 12, fontSize: 11, color: '#9CA3AF' }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── EXPLORE TAB ── */}
      {tab === 'explore' && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Trending dishes */}
          {trendingDishes.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                🔥 Trending This Week
              </p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
                {trendingDishes.map((dish, i) => (
                  <Link key={dish.name} href={`/vendor/${dish.vendorId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{ width: 140, background: '#1a1a1a', borderRadius: 14, overflow: 'hidden', border: '1px solid #252525' }}>
                      <div style={{ height: 90, background: '#252525', position: 'relative' }}>
                        {dish.photo
                          ? <img src={dish.photo} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍽️</div>
                        }
                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '2px 7px', fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
                          #{i + 1}
                        </div>
                      </div>
                      <div style={{ padding: '8px 10px 10px' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{dish.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.vendorName}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#F59E0B' }}>★ {dish.avgRating} · {dish.count} logs</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top spots */}
          {topSpots.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                ⭐ Top Spots
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topSpots.map((v, i) => (
                  <Link key={v.id} href={`/vendor/${v.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: i < 3 ? 'rgba(245,158,11,0.12)' : '#252525', border: `1px solid ${i < 3 ? 'rgba(245,158,11,0.3)' : '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>#{i + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                        {v.cuisine_tags?.length > 0 && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{v.cuisine_tags.slice(0, 2).join(' · ')}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>★ {v.avgRating}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{v.logCount} logs</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* New on the map */}
          {newVendors.length > 0 && (
            <section>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                📍 New on the Map
              </p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
                {newVendors.map(v => (
                  <Link key={v.id} href={`/vendor/${v.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{ width: 160, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: v.source === 'manual' ? 'rgba(245,158,11,0.12)' : '#252525', border: `1px solid ${v.source === 'manual' ? 'rgba(245,158,11,0.3)' : '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>
                        {v.source === 'manual' ? '📍' : '🍴'}
                      </div>
                      <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.neighborhood || v.city || v.type?.replace(/_/g, ' ')}</p>
                      {v.cuisine_tags?.length > 0 && <p style={{ margin: 0, fontSize: 11, color: '#F59E0B' }}>{v.cuisine_tags[0]}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!exploreLoaded || (trendingDishes.length === 0 && newVendors.length === 0 && topSpots.length === 0) && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>🌍</p>
              <p style={{ fontSize: 15, color: '#9CA3AF', fontWeight: 600, marginBottom: 6 }}>Nothing to explore yet</p>
              <p style={{ fontSize: 13 }}>Log some meals to see trending data here</p>
            </div>
          )}
        </div>
      )}

      {/* Detail sheet */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setSelectedLog(null)}>
          <div style={{ width: '100%', background: '#1a1a1a', borderRadius: '16px 16px 0 0', padding: '20px 20px 48px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            {selectedLog.photo_url && <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 10, maxHeight: 260, objectFit: 'cover', marginBottom: 16, display: 'block' }} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, marginLeft: 8 }}>{'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>
            {selectedLog.price_inr && <p style={{ margin: '0 0 12px', color: '#9CA3AF', fontSize: 14 }}>₹{selectedLog.price_inr}</p>}
            {selectedLog.note && <p style={{ margin: '0 0 12px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6 }}>{selectedLog.note}</p>}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="feed" onPlusClick={() => router.push('/')} />
    </div>
  )
}
