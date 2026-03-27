'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

type Tab = 'vendors' | 'dishes' | 'people'

const CITIES = [
  'Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Visakhapatnam', 'Kochi',
]

const CUISINES = [
  'Chaat', 'Momos', 'Biryani', 'South Indian', 'Dosa',
  'Rolls', 'Chinese', 'Sweets', 'Juice', 'Tea/Coffee',
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('vendors')
  const [vendors, setVendors] = useState<any[]>([])
  const [dishes, setDishes] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterCity, setFilterCity] = useState('')
  const [filterCuisine, setFilterCuisine] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q && !filterCity && !filterCuisine) { setVendors([]); setDishes([]); setPeople([]); return }
    const timer = setTimeout(() => runSearch(q), 300)
    return () => clearTimeout(timer)
  }, [query, filterCity, filterCuisine])

  async function runSearch(q: string) {
    setLoading(true)

    // Build vendor query
    let vendorQ = supabase
      .from('vendors')
      .select('id, name, type, neighborhood, city, source, cuisine_tags, is_verified, claimed_by')
    if (q) vendorQ = vendorQ.ilike('name', `%${q}%`)
    if (filterCity) vendorQ = vendorQ.eq('city', filterCity)
    if (filterCuisine) vendorQ = vendorQ.contains('cuisine_tags', [filterCuisine])

    const [{ data: vendorResults }, { data: dishResults }, { data: peopleResults }] = await Promise.all([
      vendorQ.limit(30),
      q ? supabase
        .from('meal_logs')
        .select('id, dish_name, rating, photo_url, logged_at, vendor_id, vendors(id, name), users!user_id(name)')
        .ilike('dish_name', `%${q}%`)
        .order('logged_at', { ascending: false })
        .limit(30) : Promise.resolve({ data: [] }),
      q ? supabase
        .from('users')
        .select('id, name, avatar_url, city')
        .ilike('name', `%${q}%`)
        .limit(20) : Promise.resolve({ data: [] }),
    ])
    setVendors(vendorResults ?? [])
    setDishes(dishResults ?? [])
    setPeople(peopleResults ?? [])
    setLoading(false)
  }

  const activeFilterCount = [filterCity, filterCuisine].filter(Boolean).length
  const isEmpty = !query.trim() && !filterCity && !filterCuisine
  const currentCount = tab === 'vendors' ? vendors.length : tab === 'dishes' ? dishes.length : people.length
  const noResults = !loading && !isEmpty && currentCount === 0

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'vendors', label: 'Vendors', count: vendors.length },
    { key: 'dishes', label: 'Dishes', count: dishes.length },
    { key: 'people', label: 'People', count: people.length },
  ]

  return (
    <div style={{ background: '#F9F9F9', minHeight: '100vh', color: '#1A1C1C', paddingBottom: 100 }}>

      {/* Search header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(249,249,249,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(26,28,28,0.05)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#404944', fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search vendors, dishes, people…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#FFFFFF', border: '1px solid #C0C9C2',
                borderRadius: 2, padding: '11px 36px 11px 38px',
                color: '#1A1C1C', fontSize: 15, outline: 'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#707974', fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
            )}
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            style={{
              flexShrink: 0, padding: '10px 12px', borderRadius: 4,
              border: activeFilterCount > 0 ? '1px solid #1B4F3C' : '1px solid #C0C9C2',
              background: activeFilterCount > 0 ? 'rgba(27,79,60,0.08)' : '#FFFFFF',
              color: activeFilterCount > 0 ? '#1B4F3C' : '#707974',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', position: 'relative',
            }}
          >
            ⚙️{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* City filter */}
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#404944', textTransform: 'uppercase' }}>City</p>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {CITIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setFilterCity(filterCity === c ? '' : c)}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 4,
                      border: 'none',
                      background: filterCity === c ? '#1B4F3C' : '#F3F3F3',
                      color: filterCity === c ? 'white' : '#404944',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>
            {/* Cuisine filter */}
            {tab === 'vendors' && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#404944', textTransform: 'uppercase' }}>Cuisine</p>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', flexWrap: 'wrap' }}>
                  {CUISINES.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCuisine(filterCuisine === c ? '' : c)}
                      style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 4,
                        border: 'none',
                        background: filterCuisine === c ? '#1B4F3C' : '#F3F3F3',
                        color: filterCuisine === c ? 'white' : '#404944',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >{c}</button>
                  ))}
                </div>
              </div>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterCity(''); setFilterCuisine('') }}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0 12px', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tab === t.key ? '#1B4F3C' : '#707974',
                borderBottom: tab === t.key ? '2px solid #1B4F3C' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {t.label}{!isEmpty && t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <svg style={{ margin: '0 auto 12px', display: 'block' }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B4F3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#404944', marginBottom: 6 }}>Find anything</p>
          <p style={{ fontSize: 13, color: '#707974', lineHeight: 1.6 }}>Search vendors, dishes, or people — or use the filter to browse by city</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #C0C9C2', borderTopColor: '#1B4F3C', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>🤷</p>
          <p style={{ fontSize: 15, color: '#404944', fontWeight: 600, marginBottom: 6 }}>No {tab} found</p>
          <p style={{ fontSize: 13, color: '#707974' }}>Try a different spelling or adjust your filters</p>
        </div>
      )}

      {/* Vendor results */}
      {!loading && tab === 'vendors' && vendors.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vendors.map(v => (
            <Link key={v.id} href={`/vendor/${v.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(192,201,194,0.15)', borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 4, flexShrink: 0,
                  background: v.source === 'manual' ? 'rgba(27,79,60,0.08)' : '#F3F3F3',
                  border: `1px solid ${v.source === 'manual' ? 'rgba(27,79,60,0.2)' : 'rgba(26,28,28,0.07)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {v.source === 'manual' ? '📍' : '🍴'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                    {(v.is_verified || v.claimed_by) && (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: v.is_verified ? 'white' : '#1B4F3C', background: v.is_verified ? '#1B4F3C' : 'transparent', border: v.is_verified ? 'none' : '1px solid rgba(27,79,60,0.4)', padding: '1px 6px', borderRadius: 2 }}>
                        {v.is_verified ? '✓ Verified' : '✓'}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>
                    {[v.neighborhood, v.city].filter(Boolean).join(', ') || v.type?.replace(/_/g, ' ')}
                  </p>
                  {v.cuisine_tags?.length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#1B4F3C', fontWeight: 600 }}>{v.cuisine_tags.slice(0, 3).join(' · ')}</p>
                  )}
                </div>
                <span style={{ color: '#C0C9C2', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Dish results */}
      {!loading && tab === 'dishes' && dishes.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dishes.map(log => (
            <Link key={log.id} href={`/vendor/${log.vendor_id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(192,201,194,0.15)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                {log.photo_url ? (
                  <img src={log.photo_url} alt={log.dish_name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 80, height: 80, background: '#F3F3F3', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
                )}
                <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'Manrope, sans-serif', fontStyle: 'italic', color: '#1A1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{log.dish_name}</p>
                    <span style={{ color: '#D4A574', fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{'★'.repeat(log.rating)}</span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#1B4F3C', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@ {(log.vendors as any)?.name}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {(log.users as any)?.name && <p style={{ margin: 0, fontSize: 11, color: '#707974' }}>{(log.users as any).name}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: '#C0C9C2' }}>· {timeAgo(log.logged_at)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* People results */}
      {!loading && tab === 'people' && people.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {people.map(u => (
            <Link key={u.id} href={`/user/${u.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(192,201,194,0.15)', borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: '#F3F3F3',
                  overflow: 'hidden', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 20, color: '#1B4F3C', position: 'absolute', fontWeight: 700 }}>
                    {u.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  {u.avatar_url && (
                    <img
                      src={u.avatar_url}
                      alt={u.name}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                  {u.city && (
                    <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>📍 {u.city}</p>
                  )}
                </div>
                <span style={{ color: '#C0C9C2', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="search" onPlusClick={() => router.push('/map')} />
    </div>
  )
}
