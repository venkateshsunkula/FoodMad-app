'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

export default function SavedPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { data } = await supabase
      .from('saved_vendors')
      .select('saved_at, vendors(id, name, type, source, neighborhood, city, cuisine_tags, is_verified, claimed_by)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    setSaved(data ?? [])
    setLoading(false)
  }

  async function unsave(vendorId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_vendors').delete().eq('user_id', user.id).eq('vendor_id', vendorId)
    setSaved(prev => prev.filter(s => (s.vendors as any)?.id !== vendorId))
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <h1 style={{ margin: 0, flex: 1, fontSize: 20, fontWeight: 800, fontStyle: 'italic', color: 'white' }}>Saved Spots</h1>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{saved.length} places</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {!loading && saved.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔖</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#9CA3AF', margin: '0 0 8px' }}>No saved spots yet</p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
            Tap the bookmark icon on any vendor page to save it for later
          </p>
          <button
            onClick={() => router.push('/map')}
            style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#F59E0B', color: 'black', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Explore the map
          </button>
        </div>
      )}

      {!loading && saved.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saved.map(s => {
            const v = s.vendors as any
            if (!v) return null
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Link href={`/vendor/${v.id}`} style={{ textDecoration: 'none', flex: 1 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                        {(v.is_verified || v.claimed_by) && (
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)', padding: '1px 6px', borderRadius: 10 }}>✓</span>
                        )}
                      </div>
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
                {/* Unsave button */}
                <button
                  onClick={() => unsave(v.id)}
                  style={{
                    marginLeft: 8, width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="profile" onPlusClick={() => router.push('/map')} />
    </div>
  )
}
