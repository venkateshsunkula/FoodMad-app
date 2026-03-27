'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

type Tab = 'vendors' | 'dishes'

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
  const [loading, setLoading] = useState(false)

  // Auto-focus search input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) { setVendors([]); setDishes([]); return }
    const timer = setTimeout(() => runSearch(q), 300)
    return () => clearTimeout(timer)
  }, [query])

  async function runSearch(q: string) {
    setLoading(true)
    const [{ data: vendorResults }, { data: dishResults }] = await Promise.all([
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
    ])
    setVendors(vendorResults ?? [])
    setDishes(dishResults ?? [])
    setLoading(false)
  }

  const isEmpty = query.trim() === ''
  const noResults = !loading && !isEmpty && (tab === 'vendors' ? vendors.length === 0 : dishes.length === 0)

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
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            ←
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search vendors or dishes…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 12, padding: '11px 12px 11px 38px',
                color: 'white', fontSize: 15, outline: 'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', fontSize: 18, cursor: 'pointer', padding: 0 }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {(['vendors', 'dishes'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0 12px', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: tab === t ? '#F59E0B' : '#6B7280',
                borderBottom: tab === t ? '2px solid #F59E0B' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {t === 'vendors' ? `Vendors${!isEmpty && vendors.length ? ` (${vendors.length})` : ''}` : `Dishes${!isEmpty && dishes.length ? ` (${dishes.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#9CA3AF', marginBottom: 6 }}>Find anything</p>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>Search for a vendor by name,{'\n'}or find who's eating what dish</p>
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
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: '#F59E0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@ {log.vendors?.name}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {log.users?.name && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{log.users.name}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: '#444' }}>· {timeAgo(log.logged_at)}</p>
                  </div>
                </div>
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
