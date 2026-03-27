'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compress'
import BottomNav from '../components/bottom-nav'

type Tab = 'diary' | 'collections' | 'following' | 'followers' | 'reviews'

const TABS: { key: Tab; label: string }[] = [
  { key: 'diary', label: 'Food Diary' },
  { key: 'collections', label: 'Collections' },
  { key: 'following', label: 'Following' },
  { key: 'followers', label: 'Followers' },
  { key: 'reviews', label: 'Reviews' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function ProfilePage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [vendorCount, setVendorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('diary')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)
  const [following, setFollowing] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    setAuthUser(user)

    const [{ data: db }, { data: logs }, { count }, { data: followingData }, { data: followersData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('meal_logs').select('*, vendors(name)').eq('user_id', user.id).order('logged_at', { ascending: false }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('added_by', user.id),
      // People this user follows — join to get their profile
      supabase.from('follows').select('following_id, users!following_id(id, name, avatar_url, city)').eq('follower_id', user.id),
      // People who follow this user
      supabase.from('follows').select('follower_id, users!follower_id(id, name, avatar_url, city)').eq('following_id', user.id),
    ])

    setDbUser(db)
    setMealLogs(logs ?? [])
    setVendorCount(count ?? 0)
    setFollowing(followingData?.map(f => f.users).filter(Boolean) ?? [])
    setFollowers(followersData?.map(f => f.users).filter(Boolean) ?? [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function handleUnfollow(targetId: string) {
    if (!authUser || unfollowingId) return
    setUnfollowingId(targetId)
    await supabase.from('follows').delete().eq('follower_id', authUser.id).eq('following_id', targetId)
    setFollowing(prev => prev.filter((u: any) => u.id !== targetId))
    setUnfollowingId(null)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !authUser) return
    setUploadingAvatar(true)
    try {
      const compressed = await compressImage(file)
      // Use same root-level path pattern as meal photos (meal_*.jpg works, so avatars_*.jpg should too)
      const fileName = `avatars_${authUser.id}_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('photos').upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) {
        console.error('Avatar upload error:', uploadError)
        alert(`Upload failed: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
      const url = urlData.publicUrl
      const { error: dbError } = await supabase.from('users').update({ avatar_url: url }).eq('id', authUser.id)
      if (dbError) console.error('DB update error:', dbError)
      setCustomAvatar(url)
      setDbUser((prev: any) => ({ ...prev, avatar_url: url }))
    } catch (err: any) {
      console.error('Avatar upload exception:', err)
      alert(`Upload failed: ${err?.message ?? 'Unknown error'}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const avatarUrl = customAvatar ?? dbUser?.avatar_url ?? authUser?.user_metadata?.avatar_url
  const displayName = dbUser?.name || authUser?.user_metadata?.full_name || 'Anonymous'
  const initials = displayName[0]?.toUpperCase()
  const uniqueDishes = new Set(mealLogs.map(l => l.dish_name?.toLowerCase())).size
  const avgRating = mealLogs.length
    ? (mealLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / mealLogs.length).toFixed(1)
    : null
  const latestLog = mealLogs[0] ?? null

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: '#F59E0B' }}>Profile</h1>
        <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #333', color: '#6B7280', fontSize: 12, padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>
          Sign out
        </button>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Avatar + name */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 0 24px' }}>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ position: 'absolute', inset: -8, background: '#F59E0B', borderRadius: '50%', filter: 'blur(20px)', opacity: 0.2 }} />
            <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid #333', overflow: 'hidden', background: '#1a1a1a', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 36, color: 'white', position: 'absolute' }}>{initials}</span>
              {avatarUrl && (
                <img src={avatarUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              )}
            </div>
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{
              position: 'absolute', bottom: 0, right: 0, zIndex: 2,
              width: 28, height: 28, borderRadius: '50%',
              background: uploadingAvatar ? '#333' : '#F59E0B',
              border: '2px solid #0a0a0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, cursor: uploadingAvatar ? 'default' : 'pointer',
            }}>
              {uploadingAvatar ? '⏳' : '📷'}
            </button>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>{displayName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {dbUser?.city && <span>📍 {dbUser.city}</span>}
            {dbUser?.created_at && <span>🗓 Joined {new Date(dbUser.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
          </div>
        </section>

        {/* Currently Obsessed */}
        {latestLog && (
          <section
            onClick={() => setSelectedLog(latestLog)}
            style={{
              position: 'relative', height: 160, borderRadius: 16,
              overflow: 'hidden', marginBottom: 20, cursor: 'pointer',
              background: '#1a1a1a',
              animation: 'fadeIn 0.5s ease',
            }}
          >
            {latestLog.photo_url && (
              <img src={latestLog.photo_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(0.5)', transform: 'scale(1.05)' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#F59E0B', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>
                Currently Obsessed With
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, fontStyle: 'italic', color: 'white' }}>
                {latestLog.dish_name}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                {latestLog.vendors?.name} · {dbUser?.city || 'Hyderabad'}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 16, color: '#F59E0B' }}>
                {'★'.repeat(latestLog.rating)}{'☆'.repeat(5 - latestLog.rating)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                Last logged {timeAgo(latestLog.logged_at)}
              </p>
            </div>
          </section>
        )}

        {/* Stats bento grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Logs', value: mealLogs.length, icon: '🍽️' },
            { label: 'Discovered', value: vendorCount, icon: '📍' },
            { label: 'Dishes', value: uniqueDishes, icon: '🥘' },
            { label: 'Avg Rating', value: avgRating ? `${avgRating}★` : '—', icon: '⭐' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: '#1a1a1a', border: '1px solid #252525', borderRadius: 16,
              padding: '20px 18px', position: 'relative', overflow: 'hidden',
              boxShadow: 'inset 0 0 20px rgba(245,158,11,0.04)',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
                {stat.label}
              </p>
              <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>{stat.value}</h3>
              <span style={{ position: 'absolute', bottom: -8, right: -4, fontSize: 56, opacity: 0.08, pointerEvents: 'none' }}>{stat.icon}</span>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <nav style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const count = tab.key === 'following' ? following.length : tab.key === 'followers' ? followers.length : null
            return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px 12px', flexShrink: 0,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: activeTab === tab.key ? '#F59E0B' : '#6B7280',
                borderBottom: activeTab === tab.key ? '2px solid #F59E0B' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {tab.label}{count !== null && count > 0 ? ` ${count}` : ''}
            </button>
          )})}

        </nav>

        {/* Tab: Food Diary */}
        {activeTab === 'diary' && (
          mealLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🍽️</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>No meals logged yet</p>
              <p style={{ fontSize: 13 }}>Tap + to log your first meal</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {mealLogs.map(log => (
                <div key={log.id} onClick={() => setSelectedLog(log)} style={{
                  aspectRatio: '1', background: '#1a1a1a', borderRadius: 16,
                  overflow: 'hidden', border: '1px solid #252525', cursor: 'pointer', position: 'relative',
                }}>
                  {log.photo_url ? (
                    <img src={log.photo_url} alt={log.dish_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🍽️</div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontStyle: 'italic', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.dish_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{timeAgo(log.logged_at)}</p>
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>
                    {'★'.repeat(log.rating)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab: Collections */}
        {activeTab === 'collections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Late Night Eats', 'Best Chaats in Hyd', 'Hidden Gems'].map((name, i) => (
              <div key={name} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#252525' }}>
                  {[...Array(4)].map((_, j) => (
                    <div key={j} style={{ background: `hsl(${30 + j * 20}, 40%, ${12 + j * 3}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                      {['🌙', '🍛', '💎', '⭐'][j]}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'white' }}>{name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{[8, 12, 5][i]} places</p>
                </div>
                <span style={{ color: '#333', fontSize: 20 }}>›</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <p style={{ color: '#6B7280', fontSize: 13 }}>Collections coming soon — curate your favourite spots</p>
            </div>
          </div>
        )}

        {/* Tab: Following */}
        {activeTab === 'following' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {following.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>Not following anyone yet</p>
                <p style={{ fontSize: 13 }}>Find people on vendor pages or through the feed</p>
              </div>
            ) : (
              following.map((u: any) => (
                <div key={u.id} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    onClick={() => router.push(`/user/${u.id}`)}
                    style={{ width: 44, height: 44, borderRadius: '50%', background: '#333', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', position: 'absolute' }}>{(u.name || '?')[0].toUpperCase()}</span>
                    {u.avatar_url && <img src={u.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/user/${u.id}`)}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'white' }}>{u.name}</p>
                    {u.city && <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>📍 {u.city}</p>}
                  </div>
                  <button
                    onClick={() => handleUnfollow(u.id)}
                    disabled={unfollowingId === u.id}
                    style={{ background: 'transparent', border: '1px solid #333', color: '#6B7280', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {unfollowingId === u.id ? '…' : 'Following'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Followers */}
        {activeTab === 'followers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {followers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👤</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>No followers yet</p>
                <p style={{ fontSize: 13 }}>Share your profile link to get followers</p>
              </div>
            ) : (
              followers.map((u: any) => (
                <div key={u.id} onClick={() => router.push(`/user/${u.id}`)} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#333', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', position: 'absolute' }}>{(u.name || '?')[0].toUpperCase()}</span>
                    {u.avatar_url && <img src={u.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'white' }}>{u.name}</p>
                    {u.city && <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>📍 {u.city}</p>}
                  </div>
                  <span style={{ color: '#333', fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Reviews */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mealLogs.filter(l => l.note).slice(0, 5).map(log => (
              <div key={log.id} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, fontStyle: 'italic', color: 'white' }}>{log.dish_name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{log.vendors?.name}</p>
                  </div>
                  <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{'★'.repeat(log.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, fontStyle: 'italic' }}>"{log.note}"</p>
              </div>
            ))}
            {mealLogs.filter(l => l.note).length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>✍️</p>
                <p style={{ fontSize: 14 }}>Add notes when logging meals to see them here</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Meal detail bottom sheet */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setSelectedLog(null)}>
          <div style={{ width: '100%', background: '#111', borderRadius: '20px 20px 0 0', padding: '20px 20px 48px', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #1a1a1a' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            {selectedLog.photo_url && (
              <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 14, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontStyle: 'italic' }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}</span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>
            {selectedLog.price_inr && <p style={{ margin: '0 0 14px', color: '#F59E0B', fontSize: 14, fontWeight: 700 }}>₹{selectedLog.price_inr}</p>}
            {selectedLog.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedLog.tags.map((tag: string) => (
                  <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: '#9CA3AF' }}>{tag}</span>
                ))}
              </div>
            )}
            {selectedLog.note && <p style={{ margin: '0 0 14px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>"{selectedLog.note}"</p>}
            <p style={{ margin: 0, color: '#444', fontSize: 12 }}>{new Date(selectedLog.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <BottomNav activePage="profile" onPlusClick={() => router.push('/')} />
    </div>
  )
}
