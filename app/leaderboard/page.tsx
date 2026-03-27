'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/bottom-nav'

type Tab = 'logs' | 'discoverers' | 'week'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('logs')
  const [topLoggers, setTopLoggers] = useState<any[]>([])
  const [topDiscoverers, setTopDiscoverers] = useState<any[]>([])
  const [topWeek, setTopWeek] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUserId(user?.id ?? null)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: allLogs }, { data: weekLogs }, { data: vendors }] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('user_id, users!user_id(id, name, avatar_url, city)')
        .not('user_id', 'is', null)
        .limit(1000),
      supabase
        .from('meal_logs')
        .select('user_id, users!user_id(id, name, avatar_url, city)')
        .not('user_id', 'is', null)
        .gte('logged_at', sevenDaysAgo)
        .limit(500),
      supabase
        .from('vendors')
        .select('added_by, users!added_by(id, name, avatar_url, city)')
        .eq('source', 'manual')
        .not('added_by', 'is', null)
        .limit(500),
    ])

    setTopLoggers(aggregate(allLogs ?? [], 'user_id', 'users', 'logs'))
    setTopWeek(aggregate(weekLogs ?? [], 'user_id', 'users', 'logs this week'))
    setTopDiscoverers(aggregate(vendors ?? [], 'added_by', 'users', 'vendors'))
    setLoading(false)
  }

  function aggregate(rows: any[], keyField: string, joinField: string, label: string) {
    const map: Record<string, any> = {}
    for (const row of rows) {
      const user = (row as any)[joinField] as any
      const id = row[keyField]
      if (!user || !id) continue
      if (!map[id]) map[id] = { ...user, count: 0, label }
      map[id].count++
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 20)
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'logs',        label: 'Top Loggers',   icon: '🍽️' },
    { key: 'discoverers', label: 'Discoverers',   icon: '📍' },
    { key: 'week',        label: 'This Week',     icon: '🔥' },
  ]

  const currentList = tab === 'logs' ? topLoggers : tab === 'discoverers' ? topDiscoverers : topWeek

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
          <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: 'white' }}>Leaderboard</h1>
        </div>
        <div style={{ display: 'flex' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0 12px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tab === t.key ? '#F59E0B' : '#6B7280',
                borderBottom: tab === t.key ? '2px solid #F59E0B' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {!loading && currentList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 32px' }}>
          <p style={{ fontSize: 40, margin: '0 0 14px' }}>{tabs.find(t => t.key === tab)?.icon}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#9CA3AF', margin: '0 0 8px' }}>No data yet</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Be the first on the board!</p>
        </div>
      )}

      {!loading && currentList.length > 0 && (
        <div style={{ padding: '16px 0' }}>

          {/* Top 3 podium */}
          {currentList.length >= 3 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '24px 20px 28px' }}>
              {/* 2nd */}
              <PodiumCard user={currentList[1]} rank={2} isYou={currentList[1].id === authUserId} />
              {/* 1st */}
              <PodiumCard user={currentList[0]} rank={1} isYou={currentList[0].id === authUserId} tall />
              {/* 3rd */}
              <PodiumCard user={currentList[2]} rank={3} isYou={currentList[2].id === authUserId} />
            </div>
          )}

          {/* Rest of list */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {currentList.slice(3).map((user, i) => {
              const rank = i + 4
              const isYou = user.id === authUserId
              return (
                <Link key={user.id} href={`/user/${user.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 14,
                    background: isYou ? 'rgba(245,158,11,0.06)' : 'transparent',
                    border: isYou ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                    transition: 'background 0.15s',
                  }}>
                    <span style={{ width: 24, fontSize: 14, fontWeight: 700, color: '#6B7280', textAlign: 'center', flexShrink: 0 }}>{rank}</span>
                    <Avatar user={user} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: isYou ? 800 : 600, color: isYou ? '#F59E0B' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name} {isYou && <span style={{ fontSize: 11 }}>(you)</span>}
                      </p>
                      {user.city && <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>📍 {user.city}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'white' }}>{user.count}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>{user.label}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="feed" onPlusClick={() => router.push('/')} />
    </div>
  )
}

function Avatar({ user, size }: { user: any; size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#1a1a1a', border: '2px solid #252525',
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, color: '#6B7280', position: 'absolute' }}>
        {user.name?.[0]?.toUpperCase() ?? '?'}
      </span>
      {user.avatar_url && (
        <img
          src={user.avatar_url} alt={user.name}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      )}
    </div>
  )
}

function PodiumCard({ user, rank, isYou, tall }: { user: any; rank: number; isYou: boolean; tall?: boolean }) {
  const height = tall ? 130 : 100
  const colors: Record<number, string> = { 1: '#F59E0B', 2: '#9CA3AF', 3: '#CD7F32' }
  const color = colors[rank]

  return (
    <Link href={`/user/${user.id}`} style={{ textDecoration: 'none', flex: 1, maxWidth: 110 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: tall ? 68 : 56, height: tall ? 68 : 56, borderRadius: '50%', border: `2px solid ${color}`, overflow: 'hidden', background: '#1a1a1a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: tall ? 24 : 20, color: '#6B7280', position: 'absolute' }}>{user.name?.[0]?.toUpperCase()}</span>
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            )}
          </div>
          <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', fontSize: 16 }}>{MEDAL[rank - 1]}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '6px 0 2px', fontSize: 12, fontWeight: 700, color: isYou ? '#F59E0B' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
            {user.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{user.city || ''}</p>
        </div>
        <div style={{
          width: '100%', height,
          background: `linear-gradient(to top, ${color}22, ${color}08)`,
          border: `1px solid ${color}44`,
          borderRadius: '10px 10px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2,
        }}>
          <p style={{ margin: 0, fontSize: tall ? 22 : 18, fontWeight: 800, color }}>{user.count}</p>
          <p style={{ margin: 0, fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.label}</p>
        </div>
      </div>
    </Link>
  )
}
