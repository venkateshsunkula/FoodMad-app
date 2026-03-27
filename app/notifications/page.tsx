'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:users!from_user_id(id, name, avatar_url),
        vendor:vendors!vendor_id(id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data ?? [])
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  function getNotificationContent(n: any) {
    const name = n.from_user?.name ?? 'Someone'
    if (n.type === 'follow') {
      return {
        icon: '👤',
        text: `${name} started following you`,
        link: `/user/${n.from_user_id}`,
        accent: '#F59E0B',
      }
    }
    if (n.type === 'log_at_vendor') {
      return {
        icon: '🍽️',
        text: `${name} logged a meal at your spot — ${n.vendor?.name ?? 'your vendor'}`,
        link: `/vendor/${n.vendor_id}`,
        accent: '#10B981',
      }
    }
    return { icon: '🔔', text: 'New notification', link: '/', accent: '#6B7280' }
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
        <h1 style={{ margin: 0, flex: 1, fontSize: 20, fontWeight: 800, fontStyle: 'italic', color: 'white' }}>Notifications</h1>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔔</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#9CA3AF', margin: '0 0 8px' }}>All caught up</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>You'll get notified when someone follows you or logs at a spot you discovered</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div style={{ padding: '8px 0' }}>
          {notifications.map(n => {
            const content = getNotificationContent(n)
            return (
              <Link key={n.id} href={content.link} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  background: n.read ? 'transparent' : 'rgba(245,158,11,0.04)',
                  borderBottom: '1px solid #111',
                  transition: 'background 0.15s',
                }}>
                  {/* Avatar or icon */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: '#1a1a1a', border: '1px solid #252525',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <span style={{ fontSize: 18, position: 'absolute' }}>
                        {n.from_user?.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                      {n.from_user?.avatar_url && (
                        <img
                          src={n.from_user.avatar_url}
                          alt=""
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                        />
                      )}
                    </div>
                    {/* Type badge */}
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 20, height: 20, borderRadius: '50%',
                      background: content.accent, border: '2px solid #0a0a0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10,
                    }}>
                      {content.icon}
                    </div>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 14, color: 'white', lineHeight: 1.4 }}>
                      {content.text}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="profile" onPlusClick={() => router.push('/')} />
    </div>
  )
}
