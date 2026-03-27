'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

type Tab = 'vendors' | 'dishes' | 'people'

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

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setVendors([]); setDishes([]); setPeople([]); return }
    const timer = setTimeout(() => runSearch(q), 300)
    return () => clearTimeout(timer)
  }, [query])

  async function runSearch(q: string) {
    setLoading(true)
    const [{ data: vendorResults }, { data: dishResults }, { data: peopleResults }] = await Promise.all([
      supabase
        .from('vendors')
        .select('id, name, type, neighborhood, city, source, cuisine_tags')
        .ilike('name', `%${q}%`)
        .limit(20),
      supabase
        .from('meal_logs')
        .select('id, dish_name, rating, photo_url, logged_at, vendor_id, vendors(id, name), users!user_id(name)')
        .ilike('dish_name', `%${q}%`)
        .order('logged_at', { ascending: false })
        .limit(30),
      supabase
        .from('users')
        .select('id, name, avatar_url, city')
        .ilike('name', `%${q}%`)
        .limit(20),
    ])
    setVendors(vendorResults ?? [])
    setDishes(dishResults ?? [])
    setPeople(peopleResults ?? [])
    setLoading(false)
  }

  const isEmpty = query.trim() === ''
  const currentCount = tab === 'vendors' ? vendors.length : tab === 'dishes' ? dishes.length : people.length
  const noResults = !loading && !isEmpty && currentCount === 0

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'vendors', label: 'Vendors', count: vendors.length },
    { key: 'dishes', label: 'Dishes', count: dishes.length },
    { key: 'people', label: 'People', count: people.length },
  ]

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Search header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 12, padding: '11px 36px 11px 38px',
                color: 'white', fontSize: 15, outline: 'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
            )}
          </div>
        </div>

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
                color: tab === t.key ? '#F59E0B' : '#6B7280',
                borderBottom: tab === t.key ? '2px solid #F59E0B' : '2px solid transparent',
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
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#9CA3AF', marginBottom: 6 }}>Find anything</p>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>Search vendors, dishes, or people by name</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>🤷</p>
          <p style={{ fontSize: 15, color: '#9CA3AF', fontWeight: 600, marginBottom: 6 }}>No {tab} found</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Try a different spelling</p>
        </div>
      )}

      {/* Vendor results */}
      {!loading && tab === 'vendors' && vendors.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vendors.map(v => (
            <Link key={v.id} href={`/vendor/${v.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: v.source === 'manual' ? 'rgba(245,158,11,0.12)' : '#252525',
                  border: `1px solid ${v.source === 'manual' ? 'rgba(245,158,11,0.3)' : '#333'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {v.source === 'manual' ? '📍' : '🍴'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                    {[v.neighborhood, v.city].filter(Boolean).join(', ') || v.type?.replace(/_/g, ' ')}
                  </p>
                  {v.cuisine_tags?.length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#F59E0B' }}>{v.cuisine_tags.slice(0, 3).join(' · ')}</p>
                  )}
                </div>
                <span style={{ color: '#333', fontSize: 18, flexShrink: 0 }}>›</span>
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
              <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, overflow: 'hidden', display: 'flex' }}>
                {log.photo_url ? (
                  <img src={log.photo_url} alt={log.dish_name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 80, height: 80, background: '#252525', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
                )}
                <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{log.dish_name}</p>
                    <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{'★'.repeat(log.rating)}</span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#F59E0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@ {(log.vendors as any)?.name}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {(log.users as any)?.name && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{(log.users as any).name}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: '#444' }}>· {timeAgo(log.logged_at)}</p>
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
              <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: '#252525', border: '2px solid #333',
                  overflow: 'hidden', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 20, color: '#6B7280', position: 'absolute' }}>
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
                  <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                  {u.city && (
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>📍 {u.city}</p>
                  )}
                </div>
                <span style={{ color: '#333', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="search" onPlusClick={() => router.push('/')} />
    </div>
  )
}
