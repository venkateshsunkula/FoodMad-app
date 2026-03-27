'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

const CITIES = ['All Cities', 'Hyderabad', 'Bangalore', 'Delhi', 'Mumbai', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Guntur']

interface DishStat {
  name: string
  avgRating: number
  count: number
  photo: string | null
  topVendorName: string
  topVendorId: string
  topRating: number
}

interface DishLog {
  id: string
  rating: number
  photo_url: string | null
  price_inr: number | null
  note: string | null
  logged_at: string
  vendor_id: string
  vendors: any
  users: any
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function StarBar({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: '#252525', overflow: 'hidden' }}>
        <div style={{ width: `${(rating / max) * 100}%`, height: '100%', background: '#F59E0B', borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>{rating.toFixed(1)}</span>
    </div>
  )
}

export default function DishesPage() {
  const router = useRouter()
  const [city, setCity] = useState('All Cities')
  const [dishes, setDishes] = useState<DishStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState<DishStat | null>(null)
  const [dishLogs, setDishLogs] = useState<DishLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => { loadDishes() }, [city])

  async function loadDishes() {
    setLoading(true)
    setSelectedDish(null)

    let query = supabase
      .from('meal_logs')
      .select('dish_name, rating, photo_url, vendor_id, vendors!vendor_id(id, name, city)')
      .not('dish_name', 'is', null)
      .limit(2000)

    if (city !== 'All Cities') {
      // Filter via vendor city — join handled client-side
    }

    const { data: logs } = await query

    // Group by dish name
    const map: Record<string, { ratings: number[]; photos: string[]; vendors: { id: string; name: string; rating: number }[] }> = {}

    for (const log of logs ?? []) {
      const vendor = (log.vendors as any)
      if (city !== 'All Cities' && vendor?.city !== city) continue
      const key = log.dish_name?.toLowerCase().trim()
      if (!key || !log.dish_name) continue
      if (!map[key]) map[key] = { ratings: [], photos: [], vendors: [] }
      map[key].ratings.push(log.rating ?? 0)
      if (log.photo_url) map[key].photos.push(log.photo_url)
      if (vendor?.id && log.rating) {
        map[key].vendors.push({ id: vendor.id, name: vendor.name, rating: log.rating })
      }
    }

    // Build stats, require at least 2 logs
    const stats: DishStat[] = Object.entries(map)
      .filter(([, v]) => v.ratings.length >= 1)
      .map(([key, v]) => {
        const avg = v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length
        // Find vendor with most logs for this dish
        const vendorCounts: Record<string, { name: string; count: number; totalRating: number }> = {}
        for (const ven of v.vendors) {
          if (!vendorCounts[ven.id]) vendorCounts[ven.id] = { name: ven.name, count: 0, totalRating: 0 }
          vendorCounts[ven.id].count++
          vendorCounts[ven.id].totalRating += ven.rating
        }
        const topVendor = Object.entries(vendorCounts).sort((a, b) => (b[1].totalRating / b[1].count) - (a[1].totalRating / a[1].count))[0]
        // Capitalize dish name
        const name = (logs?.find(l => l.dish_name?.toLowerCase().trim() === key))?.dish_name ?? key

        return {
          name,
          avgRating: avg,
          count: v.ratings.length,
          photo: v.photos[0] ?? null,
          topVendorName: topVendor?.[1]?.name ?? '',
          topVendorId: topVendor?.[0] ?? '',
          topRating: topVendor ? topVendor[1].totalRating / topVendor[1].count : 0,
        }
      })
      .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
      .slice(0, 60)

    setDishes(stats)
    setLoading(false)
  }

  async function openDish(dish: DishStat) {
    setSelectedDish(dish)
    setLoadingLogs(true)

    let query = supabase
      .from('meal_logs')
      .select('id, rating, photo_url, price_inr, note, logged_at, vendor_id, vendors!vendor_id(id, name, city), users!user_id(id, name, avatar_url)')
      .ilike('dish_name', dish.name)
      .order('rating', { ascending: false })
      .limit(30)

    const { data } = await query
    setDishLogs((data ?? []) as DishLog[])
    setLoadingLogs(false)
  }

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: 'white', lineHeight: 1 }}>Dish Rankings</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Best-rated dishes across all spots</p>
          </div>
        </div>
        {/* City filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1px solid ${city === c ? '#F59E0B' : '#252525'}`,
                background: city === c ? '#F59E0B' : '#1a1a1a',
                color: city === c ? 'black' : '#9CA3AF',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{c}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {!loading && dishes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px' }}>
          <p style={{ fontSize: 40, margin: '0 0 14px' }}>🍽️</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#9CA3AF' }}>No dishes yet in {city}</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Log some meals to build the rankings!</p>
        </div>
      )}

      {!loading && dishes.length > 0 && (
        <div style={{ padding: '16px 16px' }}>

          {/* Top 3 podium row */}
          {dishes.length >= 3 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280' }}>Top Rated</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {dishes.slice(0, 3).map((dish, i) => (
                  <div
                    key={dish.name}
                    onClick={() => openDish(dish)}
                    style={{
                      background: '#1a1a1a', border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.4)' : '#252525'}`,
                      borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                      boxShadow: i === 0 ? '0 4px 20px rgba(245,158,11,0.1)' : 'none',
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '1', background: '#252525' }}>
                      {dish.photo ? (
                        <img src={dish.photo} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)' }} />
                      <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 18 }}>{MEDAL[i]}</div>
                    </div>
                    <div style={{ padding: '10px 10px 12px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</p>
                      <StarBar rating={dish.avgRating} />
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#6B7280' }}>{dish.count} log{dish.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full list */}
          <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B7280' }}>All Rankings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dishes.map((dish, i) => (
              <div
                key={dish.name}
                onClick={() => openDish(dish)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  background: '#1a1a1a', border: '1px solid #1e1e1e',
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ width: 24, fontSize: 13, fontWeight: 700, color: i < 3 ? '#F59E0B' : '#444', textAlign: 'center', flexShrink: 0 }}>
                  {i < 3 ? MEDAL[i] : `${i + 1}`}
                </span>
                {dish.photo ? (
                  <img src={dish.photo} alt={dish.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: '#252525', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Best at: {dish.topVendorName || '—'}
                  </p>
                  <StarBar rating={dish.avgRating} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#F59E0B' }}>{dish.avgRating.toFixed(1)}★</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>{dish.count} logs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dish detail sheet */}
      {selectedDish && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedDish(null)}
        >
          <div
            style={{ width: '100%', background: '#111', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #1a1a1a' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#111', zIndex: 2 }}>
              <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, fontStyle: 'italic' }}>{selectedDish.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StarBar rating={selectedDish.avgRating} />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{selectedDish.count} logs</span>
                  </div>
                </div>
                {selectedDish.topVendorId && (
                  <Link
                    href={`/vendor/${selectedDish.topVendorId}`}
                    onClick={() => setSelectedDish(null)}
                    style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 10, background: '#F59E0B', color: 'black', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}
                  >
                    Best spot →
                  </Link>
                )}
              </div>
            </div>

            {/* Logs */}
            <div style={{ padding: '12px 16px 32px' }}>
              {loadingLogs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <div style={{ width: 24, height: 24, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dishLogs.map(log => (
                    <Link key={log.id} href={`/vendor/${log.vendor_id}`} onClick={() => setSelectedDish(null)} style={{ textDecoration: 'none' }}>
                      <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden', display: 'flex' }}>
                        {log.photo_url ? (
                          <img src={log.photo_url} alt="" style={{ width: 76, height: 76, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 76, height: 76, background: '#252525', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍽️</div>
                        )}
                        <div style={{ padding: '10px 14px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F59E0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              @ {(log.vendors as any)?.name}
                            </p>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>{'★'.repeat(log.rating)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {(log.users as any)?.name && <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{(log.users as any).name}</p>}
                            {log.price_inr && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>₹{log.price_inr}</p>}
                            <p style={{ margin: 0, fontSize: 11, color: '#444' }}>· {timeAgo(log.logged_at)}</p>
                          </div>
                          {log.note && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{log.note}"</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="feed" onPlusClick={() => router.push('/')} />
    </div>
  )
}
