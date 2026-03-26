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

  const uniqueDishes = new Set(mealLogs.map(l => l.dish_name?.toLowerCase())).size

  function formatDate(dateStr: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: '1px solid #333',
            color: '#9CA3AF', fontSize: 13, padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

      {/* Profile section */}
      <div style={{ padding: '20px 20px 24px', textAlign: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          margin: '0 auto 14px',
          border: '2px solid #F59E0B',
          overflow: 'hidden',
          background: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {authUser?.user_metadata?.avatar_url ? (
            <img
              src={authUser.user_metadata.avatar_url}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 32, color: 'white' }}>
              {(dbUser?.name || authUser?.email || '?')[0].toUpperCase()}
            </span>
          )}
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
          {dbUser?.name || 'Anonymous'}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF' }}>
          {dbUser?.city || 'No city set'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
        {[
          { value: mealLogs.length, label: 'meals' },
          { value: vendorCount, label: 'discovered' },
          { value: uniqueDishes, label: 'dishes' },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1, padding: '18px 0', textAlign: 'center',
              borderRight: i < 2 ? '1px solid #1a1a1a' : 'none',
            }}
          >
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{stat.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Meals grid */}
      <div style={{ padding: '20px 16px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>Your meals</p>

        {mealLogs.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 48 }}>
            No meals logged yet.{'\n'}Tap + to log your first meal.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {mealLogs.map(log => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{
                  background: '#1a1a1a',
                  borderRadius: 10,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #222',
                }}
              >
                {/* Photo or placeholder */}
                <div style={{ aspectRatio: '1', position: 'relative', background: '#111' }}>
                  {log.photo_url ? (
                    <img
                      src={log.photo_url}
                      alt={log.dish_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32,
                    }}>
                      🍽️
                    </div>
                  )}
                  {/* Rating badge */}
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.65)',
                    borderRadius: 6, padding: '2px 6px',
                    fontSize: 11, color: '#F59E0B', fontWeight: 700,
                  }}>
                    {'★'.repeat(log.rating)}
                  </div>
                </div>
                {/* Text */}
                <div style={{ padding: '8px 10px 10px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.dish_name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.vendors?.name} · {formatDate(log.logged_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meal detail bottom sheet */}
      {selectedLog && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              width: '100%', background: '#1a1a1a',
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px 48px',
              maxHeight: '85vh', overflowY: 'auto',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Pull handle */}
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

            {selectedLog.photo_url && (
              <img
                src={selectedLog.photo_url}
                alt={selectedLog.dish_name}
                style={{ width: '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}
              </span>
            </div>

            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>

            {selectedLog.price_inr && (
              <p style={{ margin: '0 0 14px', color: '#9CA3AF', fontSize: 14 }}>₹{selectedLog.price_inr}</p>
            )}

            {selectedLog.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedLog.tags.map((tag: string) => (
                  <span key={tag} style={{
                    background: '#333', padding: '4px 10px',
                    borderRadius: 16, fontSize: 12, color: '#E5E7EB',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {selectedLog.note && (
              <p style={{ margin: '0 0 14px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6 }}>
                {selectedLog.note}
              </p>
            )}

            <p style={{ margin: 0, color: '#6B7280', fontSize: 12 }}>
              {formatDate(selectedLog.logged_at)}
            </p>
          </div>
        </div>
      )}

      <BottomNav activePage="profile" onPlusClick={() => router.push('/')} />
    </div>
  )
}
