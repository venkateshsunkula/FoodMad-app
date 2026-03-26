'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

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

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUser(user)

    if (!user) { setLoading(false); return }

    // Get IDs of people this user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = following?.map(f => f.following_id) ?? []

    if (followingIds.length === 0) { setLoading(false); return }

    // Fetch their meal logs
    const { data } = await supabase
      .from('meal_logs')
      .select('*, vendors(id, name), users!user_id(id, name, avatar_url)')
      .in('user_id', followingIds)
      .order('logged_at', { ascending: false })
      .limit(60)

    setLogs(data ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1a1a1a' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Feed</h1>
      </div>

      {/* Not signed in */}
      {!authUser && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 20 }}>
            Sign in to see what people around you are eating.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: '#F59E0B', color: 'black', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Go to map
          </button>
        </div>
      )}

      {/* Signed in but following nobody */}
      {authUser && logs.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>👋</p>
          <p style={{ color: 'white', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Your feed is empty</p>
          <p style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 1.6 }}>
            Follow people to see their meals here.{'\n'}Find them on the map or through vendor pages.
          </p>
        </div>
      )}

      {/* Feed items */}
      {logs.map(log => (
        <div key={log.id} style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 20px' }}>

          {/* User row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Link href={`/user/${log.users?.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#333', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {log.users?.avatar_url ? (
                  <img src={log.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                ) : (
                  <span style={{ color: 'white', fontSize: 14 }}>
                    {(log.users?.name || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{log.users?.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{timeAgo(log.logged_at)}</p>
              </div>
            </Link>
            <span style={{ color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>
              {'★'.repeat(log.rating)}
            </span>
          </div>

          {/* Photo */}
          {log.photo_url && (
            <img
              src={log.photo_url}
              alt={log.dish_name}
              onClick={() => setSelectedLog(log)}
              style={{ width: '100%', borderRadius: 10, maxHeight: 280, objectFit: 'cover', display: 'block', marginBottom: 12, cursor: 'pointer' }}
            />
          )}

          {/* Dish + vendor */}
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{log.dish_name}</p>
          {log.vendors && (
            <Link href={`/vendor/${log.vendors.id}`} style={{ textDecoration: 'none' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#F59E0B' }}>@ {log.vendors.name}</p>
            </Link>
          )}

          {/* Tags */}
          {log.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {log.tags.map((tag: string) => (
                <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '3px 8px', borderRadius: 12, fontSize: 11, color: '#9CA3AF' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Detail sheet */}
      {selectedLog && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{ width: '100%', background: '#1a1a1a', borderRadius: '16px 16px 0 0', padding: '20px 20px 48px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            {selectedLog.photo_url && (
              <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 10, maxHeight: 260, objectFit: 'cover', marginBottom: 16, display: 'block' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, marginLeft: 8 }}>
                {'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}
              </span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>
            {selectedLog.price_inr && <p style={{ margin: '0 0 12px', color: '#9CA3AF', fontSize: 14 }}>₹{selectedLog.price_inr}</p>}
            {selectedLog.note && <p style={{ margin: '0 0 12px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6 }}>{selectedLog.note}</p>}
          </div>
        </div>
      )}

      <BottomNav activePage="feed" onPlusClick={() => router.push('/')} />
    </div>
  )
}
