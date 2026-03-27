'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compress'
import BottomNav from '../components/bottom-nav'
import ShareCard from '../components/share-card'

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
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [shareLog, setShareLog] = useState<any>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const ALL_TAGS = ['🌶️ Spicy', '🍋 Tangy', '🥨 Crispy', '🧈 Creamy', '🌿 Fresh', '🔥 Hot', '🍬 Sweet', '🥩 Non-veg', '🥦 Veg', '⭐ Must-try', '🌙 Late night', '🌤️ Seasonal']

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

    const { count: unread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(unread ?? 0)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/')
  }

  function openEdit(log: any) {
    setEditFields({ dish_name: log.dish_name, rating: log.rating, price_inr: log.price_inr ?? '', note: log.note ?? '', tags: log.tags ?? [] })
    setEditMode(true)
    setConfirmDelete(false)
  }

  function closeDetail() {
    setSelectedLog(null)
    setEditMode(false)
    setEditFields(null)
    setConfirmDelete(false)
  }

  async function handleSaveEdit() {
    if (!selectedLog || saving) return
    setSaving(true)
    const updates = {
      dish_name: editFields.dish_name.trim(),
      rating: editFields.rating,
      price_inr: editFields.price_inr ? parseInt(editFields.price_inr) : null,
      note: editFields.note.trim() || null,
      tags: editFields.tags,
    }
    await supabase.from('meal_logs').update(updates).eq('id', selectedLog.id)
    setMealLogs(prev => prev.map(l => l.id === selectedLog.id ? { ...l, ...updates } : l))
    setSelectedLog((prev: any) => ({ ...prev, ...updates }))
    setEditMode(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!selectedLog || saving) return
    setSaving(true)
    await supabase.from('meal_logs').delete().eq('id', selectedLog.id)
    setMealLogs(prev => prev.filter(l => l.id !== selectedLog.id))
    closeDetail()
    setSaving(false)
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

  // ── Streak calculation ────────────────────────────────────────────
  const streak = (() => {
    if (!mealLogs.length) return { current: 0, best: 0, loggedToday: false }
    const dates = [...new Set(mealLogs.map(l => l.logged_at?.slice(0, 10)))].filter(Boolean).sort().reverse() as string[]
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const loggedToday = dates[0] === today

    let current = 0
    if (dates[0] === today || dates[0] === yesterday) {
      let prev = new Date(dates[0])
      for (const d of dates) {
        const cur = new Date(d)
        const diff = Math.round((prev.getTime() - cur.getTime()) / 86400000)
        if (diff <= 1) { current++; prev = cur } else break
      }
    }

    let best = current, run = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round((new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000)
      if (diff === 1) { run++; if (run > best) best = run } else run = 1
    }
    return { current, best, loggedToday }
  })()

  // ── Badges ────────────────────────────────────────────────────────
  const BADGES = [
    { icon: '🍽️', name: 'First Bite',      desc: 'Logged your first meal',     earned: mealLogs.length >= 1 },
    { icon: '🥘', name: 'Regular',          desc: '10 meals logged',             earned: mealLogs.length >= 10 },
    { icon: '🏆', name: 'Food Lover',       desc: '50 meals logged',             earned: mealLogs.length >= 50 },
    { icon: '💯', name: 'Century',          desc: '100 meals logged',            earned: mealLogs.length >= 100 },
    { icon: '🔥', name: 'On Fire',          desc: '3-day logging streak',        earned: streak.best >= 3 },
    { icon: '⚡', name: 'Weekly Warrior',   desc: '7-day logging streak',        earned: streak.best >= 7 },
    { icon: '🌟', name: 'Dedicated',        desc: '30-day logging streak',       earned: streak.best >= 30 },
    { icon: '📍', name: 'Explorer',         desc: 'Discovered your first vendor',earned: vendorCount >= 1 },
    { icon: '🗺️', name: 'Cartographer',    desc: 'Discovered 5+ vendors',       earned: vendorCount >= 5 },
    { icon: '🍱', name: 'Variety Pack',     desc: 'Tried 10 different dishes',   earned: uniqueDishes >= 10 },
    { icon: '🎨', name: 'Foodie Artist',    desc: 'Tried 25 different dishes',   earned: uniqueDishes >= 25 },
  ]
  const earnedBadges = BADGES.filter(b => b.earned)
  const lockedBadges = BADGES.filter(b => !b.earned)

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#707974' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#F9F9F9', minHeight: '100vh', color: '#1A1C1C', paddingBottom: 100 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'rgba(249,249,249,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(26,28,28,0.05)',
      }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#1B4F3C', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C', flex: 1, textTransform: 'uppercase', letterSpacing: '-0.3px', paddingLeft: 12 }}>FOODMAD</h1>
        <Link href="/notifications" style={{ position: 'relative', textDecoration: 'none', marginRight: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 4, background: '#F3F3F3', border: '1px solid rgba(26,28,28,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4F3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          {unreadCount > 0 && (
            <div style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', border: '2px solid #F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', padding: '0 3px' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Link>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 4,
            border: '1px solid #C0C9C2',
            background: signingOut ? '#F3F3F3' : 'transparent',
            color: signingOut ? '#C0C9C2' : '#404944',
            fontSize: 13, fontWeight: 700,
            cursor: signingOut ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {signingOut ? (
            <>
              <span style={{ width: 12, height: 12, border: '2px solid #C0C9C2', borderTopColor: '#1B4F3C', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Signing out…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </>
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px' }}>

        {/* Avatar + name */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 0 24px' }}>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ position: 'absolute', inset: -8, background: '#1B4F3C', borderRadius: '50%', filter: 'blur(20px)', opacity: 0.1 }} />
            <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid #1B4F3C', overflow: 'hidden', background: '#F3F3F3', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 36, color: '#1B4F3C', position: 'absolute', fontWeight: 700 }}>{initials}</span>
              {avatarUrl && (
                <img src={avatarUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              )}
            </div>
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{
              position: 'absolute', bottom: 0, right: 0, zIndex: 2,
              width: 28, height: 28, borderRadius: '50%',
              background: uploadingAvatar ? '#C0C9C2' : '#1B4F3C',
              border: '2px solid #F9F9F9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, cursor: uploadingAvatar ? 'default' : 'pointer',
            }}>
              {uploadingAvatar ? '⏳' : '📷'}
            </button>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 30, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C' }}>{displayName}</h2>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#1B4F3C', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Food Explorer</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#404944', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {dbUser?.city && <span>📍 {dbUser.city}</span>}
            {dbUser?.created_at && <span>🗓 Joined {new Date(dbUser.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/leaderboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 4, background: '#1B4F3C', border: 'none', textDecoration: 'none', color: 'white', fontSize: 12, fontWeight: 700 }}>
              🏆 Leaderboard
            </Link>
            <Link href="/saved" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 4, background: '#1B4F3C', border: 'none', textDecoration: 'none', color: 'white', fontSize: 12, fontWeight: 700 }}>
              🔖 Saved Spots
            </Link>
          </div>
        </section>

        {/* Streak card */}
        {mealLogs.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{
              background: '#F3F3F3',
              border: `1px solid ${streak.current >= 3 ? 'rgba(27,79,60,0.2)' : 'rgba(26,28,28,0.07)'}`,
              borderRadius: 4, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              {/* Flame */}
              <div style={{
                width: 52, height: 52, borderRadius: 4, flexShrink: 0,
                background: streak.current > 0 ? 'rgba(27,79,60,0.1)' : '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
              }}>
                {streak.current > 0 ? '🔥' : '💤'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: streak.current > 0 ? '#1B4F3C' : '#707974' }}>
                    {streak.current}
                  </span>
                  <span style={{ fontSize: 14, color: '#404944', fontWeight: 600 }}>
                    day streak
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>
                  {streak.loggedToday
                    ? '✓ Logged today — keep it up!'
                    : streak.current > 0
                    ? "Log something today to keep your streak!"
                    : 'Start logging daily to build a streak'}
                </p>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#404944' }}>{streak.best}</p>
                <p style={{ margin: 0, fontSize: 10, color: '#707974', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Best</p>
              </div>
            </div>
          </section>
        )}

        {/* Currently Obsessed */}
        {latestLog && (
          <section
            onClick={() => setSelectedLog(latestLog)}
            style={{
              position: 'relative', height: 160, borderRadius: 4,
              overflow: 'hidden', marginBottom: 20, cursor: 'pointer',
              background: '#F3F3F3',
              animation: 'fadeIn 0.5s ease',
            }}
          >
            {latestLog.photo_url && (
              <img src={latestLog.photo_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) brightness(0.5)', transform: 'scale(1.05)' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(27,79,60,0.85) 0%, rgba(27,79,60,0.5) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#D4A574', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>
                Currently Obsessed With
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: 'white' }}>
                {latestLog.dish_name}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {latestLog.vendors?.name} · {dbUser?.city || 'Hyderabad'}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 16, color: '#D4A574' }}>
                {'★'.repeat(latestLog.rating)}{'☆'.repeat(5 - latestLog.rating)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
                Last logged {timeAgo(latestLog.logged_at)}
              </p>
            </div>
          </section>
        )}

        {/* Stats bento grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Logs', value: mealLogs.length, icon: '🍽️', featured: true },
            { label: 'Discovered', value: vendorCount, icon: '📍', featured: false },
            { label: 'Dishes', value: uniqueDishes, icon: '🥘', featured: false },
            { label: 'Avg Rating', value: avgRating ? `${avgRating}★` : '—', icon: '⭐', featured: false },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: stat.featured ? '#1B4F3C' : '#F3F3F3',
              borderRadius: 4,
              padding: '20px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: stat.featured ? 'rgba(255,255,255,0.7)' : '#707974', fontFamily: 'Inter, sans-serif' }}>
                {stat.label}
              </p>
              <h3 style={{ margin: 0, fontSize: 32, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: stat.featured ? 'white' : '#1A1C1C' }}>{stat.value}</h3>
              <span style={{ position: 'absolute', bottom: -8, right: -4, fontSize: 56, opacity: 0.08, pointerEvents: 'none' }}>{stat.icon}</span>
            </div>
          ))}
        </section>

        {/* Badges */}
        {(earnedBadges.length > 0 || lockedBadges.length > 0) && (
          <section style={{ marginBottom: 28 }}>
            <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#707974' }}>Badges</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {earnedBadges.map(b => (
                <div key={b.name} title={b.desc} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 4,
                  background: 'rgba(27,79,60,0.1)', border: '1px solid rgba(27,79,60,0.3)',
                  cursor: 'default',
                }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1B4F3C' }}>{b.name}</span>
                </div>
              ))}
              {lockedBadges.map(b => (
                <div key={b.name} title={b.desc} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 4,
                  background: '#F3F3F3', border: '1px solid rgba(26,28,28,0.07)',
                  cursor: 'default', opacity: 0.4,
                  filter: 'grayscale(1)',
                }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#707974' }}>{b.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <nav style={{ display: 'flex', borderBottom: '1px solid rgba(26,28,28,0.07)', marginBottom: 20, overflowX: 'auto' }}>
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
                color: activeTab === tab.key ? '#1B4F3C' : '#707974',
                borderBottom: activeTab === tab.key ? '2px solid #1B4F3C' : '2px solid transparent',
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
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#707974' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🍽️</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#404944', marginBottom: 6 }}>No meals logged yet</p>
              <p style={{ fontSize: 13 }}>Tap + to log your first meal</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {mealLogs.map(log => (
                <div key={log.id} onClick={() => setSelectedLog(log)} style={{
                  aspectRatio: '1', background: '#F3F3F3', borderRadius: 4,
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}>
                  {log.photo_url ? (
                    <img src={log.photo_url} alt={log.dish_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.9 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🍽️</div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.dish_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#1B4F3C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{timeAgo(log.logged_at)}</p>
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRadius: 2, padding: '2px 7px', fontSize: 11, color: '#D4A574', fontWeight: 700 }}>
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
              <div key={name} style={{ background: '#FFFFFF', border: '1px solid rgba(26,28,28,0.07)', borderRadius: 4, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: 60, height: 60, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#F3F3F3' }}>
                  {[...Array(4)].map((_, j) => (
                    <div key={j} style={{ background: `hsl(${150 + j * 10}, 20%, ${88 + j * 2}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                      {['🌙', '🍛', '💎', '⭐'][j]}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C' }}>{name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>{[8, 12, 5][i]} places</p>
                </div>
                <span style={{ color: '#C0C9C2', fontSize: 20 }}>›</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <p style={{ color: '#707974', fontSize: 13 }}>Collections coming soon — curate your favourite spots</p>
            </div>
          </div>
        )}

        {/* Tab: Following */}
        {activeTab === 'following' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {following.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#707974' }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#404944', marginBottom: 6 }}>Not following anyone yet</p>
                <p style={{ fontSize: 13 }}>Find people on vendor pages or through the feed</p>
              </div>
            ) : (
              following.map((u: any) => (
                <div key={u.id} style={{ background: '#FFFFFF', border: '1px solid rgba(26,28,28,0.07)', borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    onClick={() => router.push(`/user/${u.id}`)}
                    style={{ width: 44, height: 44, borderRadius: '50%', background: '#F3F3F3', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1B4F3C', position: 'absolute' }}>{(u.name || '?')[0].toUpperCase()}</span>
                    {u.avatar_url && <img src={u.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/user/${u.id}`)}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#1A1C1C' }}>{u.name}</p>
                    {u.city && <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>📍 {u.city}</p>}
                  </div>
                  <button
                    onClick={() => handleUnfollow(u.id)}
                    disabled={unfollowingId === u.id}
                    style={{ background: 'transparent', border: '1px solid #C0C9C2', color: '#404944', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
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
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#707974' }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👤</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#404944', marginBottom: 6 }}>No followers yet</p>
                <p style={{ fontSize: 13 }}>Share your profile link to get followers</p>
              </div>
            ) : (
              followers.map((u: any) => (
                <div key={u.id} onClick={() => router.push(`/user/${u.id}`)} style={{ background: '#FFFFFF', border: '1px solid rgba(26,28,28,0.07)', borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F3F3F3', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1B4F3C', position: 'absolute' }}>{(u.name || '?')[0].toUpperCase()}</span>
                    {u.avatar_url && <img src={u.avatar_url} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#1A1C1C' }}>{u.name}</p>
                    {u.city && <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>📍 {u.city}</p>}
                  </div>
                  <span style={{ color: '#C0C9C2', fontSize: 18, flexShrink: 0 }}>›</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Reviews */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mealLogs.filter(l => l.note).slice(0, 5).map(log => (
              <div key={log.id} style={{ background: '#FFFFFF', border: '1px solid rgba(26,28,28,0.07)', borderRadius: 4, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C' }}>{log.dish_name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#707974' }}>{log.vendors?.name}</p>
                  </div>
                  <span style={{ color: '#D4A574', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{'★'.repeat(log.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#404944', lineHeight: 1.6, fontStyle: 'italic' }}>"{log.note}"</p>
              </div>
            ))}
            {mealLogs.filter(l => l.note).length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#707974' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>✍️</p>
                <p style={{ fontSize: 14 }}>Add notes when logging meals to see them here</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Meal detail / edit bottom sheet */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={closeDetail}>
          <div style={{ width: '100%', background: '#FFFFFF', borderRadius: '6px 6px 0 0', padding: '20px 20px 36px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: '#C0C9C2', borderRadius: 2, margin: '0 auto 20px' }} />

            {/* View mode */}
            {!editMode && (
              <>
                {selectedLog.photo_url && (
                  <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 4, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C' }}>{selectedLog.dish_name}</h3>
                  <span style={{ color: '#D4A574', fontSize: 15, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}</span>
                </div>
                <p style={{ margin: '0 0 4px', color: '#1B4F3C', fontSize: 14, fontWeight: 600 }}>{selectedLog.vendors?.name}</p>
                {selectedLog.price_inr && <p style={{ margin: '0 0 14px', color: '#1B4F3C', fontSize: 14, fontWeight: 700 }}>₹{selectedLog.price_inr}</p>}
                {selectedLog.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {selectedLog.tags.map((tag: string) => (
                      <span key={tag} style={{ background: '#F3F3F3', padding: '4px 12px', borderRadius: 2, fontSize: 12, color: '#404944' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {selectedLog.note && <p style={{ margin: '0 0 14px', color: '#404944', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>"{selectedLog.note}"</p>}
                <p style={{ margin: '0 0 20px', color: '#C0C9C2', fontSize: 12 }}>{new Date(selectedLog.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                {/* Actions */}
                {!confirmDelete ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      onClick={() => setShareLog(selectedLog)}
                      style={{ width: '100%', padding: '14px 0', borderRadius: 4, border: 'none', background: '#1B4F3C', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(27,79,60,0.25)' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share this meal
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => openEdit(selectedLog)} style={{ flex: 1, padding: '12px 0', borderRadius: 4, border: '1px solid #C0C9C2', background: 'transparent', color: '#1A1C1C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => setConfirmDelete(true)} style={{ flex: 1, padding: '12px 0', borderRadius: 4, border: '1px solid #C0C9C2', background: 'transparent', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#F3F3F3', borderRadius: 4, padding: '16px' }}>
                    <p style={{ margin: '0 0 14px', fontSize: 14, color: '#404944', textAlign: 'center' }}>Delete this meal log? This can't be undone.</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '11px 0', borderRadius: 4, border: '1px solid #C0C9C2', background: 'transparent', color: '#404944', fontSize: 14, cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button onClick={handleDelete} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 4, border: 'none', background: '#EF4444', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        {saving ? 'Deleting…' : 'Yes, delete'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Edit mode */}
            {editMode && editFields && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: '#1A1C1C' }}>Edit Meal</h3>
                  <button onClick={() => setEditMode(false)} style={{ background: 'none', border: 'none', color: '#707974', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                </div>

                {/* Dish name */}
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B4F3C' }}>Dish Name</p>
                <input
                  value={editFields.dish_name}
                  onChange={e => setEditFields((p: any) => ({ ...p, dish_name: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#F9F9F9', border: '1px solid #C0C9C2', borderRadius: 2, padding: '11px 14px', color: '#1A1C1C', fontSize: 15, marginBottom: 16, outline: 'none' }}
                />

                {/* Rating */}
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B4F3C' }}>Rating</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setEditFields((p: any) => ({ ...p, rating: r }))} style={{ flex: 1, padding: '10px 0', borderRadius: 4, border: `1px solid ${editFields.rating >= r ? '#1B4F3C' : '#C0C9C2'}`, background: editFields.rating >= r ? 'rgba(27,79,60,0.1)' : 'transparent', color: editFields.rating >= r ? '#1B4F3C' : '#707974', fontSize: 18, cursor: 'pointer' }}>
                      ★
                    </button>
                  ))}
                </div>

                {/* Price */}
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B4F3C' }}>Price (₹)</p>
                <input
                  type="number"
                  value={editFields.price_inr}
                  onChange={e => setEditFields((p: any) => ({ ...p, price_inr: e.target.value }))}
                  placeholder="Optional"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#F9F9F9', border: '1px solid #C0C9C2', borderRadius: 2, padding: '11px 14px', color: '#1A1C1C', fontSize: 15, marginBottom: 16, outline: 'none' }}
                />

                {/* Tags */}
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B4F3C' }}>Tags</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {ALL_TAGS.map(tag => {
                    const active = editFields.tags.includes(tag)
                    return (
                      <button key={tag} onClick={() => setEditFields((p: any) => ({ ...p, tags: active ? p.tags.filter((t: string) => t !== tag) : [...p.tags, tag] }))}
                        style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${active ? '#1B4F3C' : '#C0C9C2'}`, background: active ? 'rgba(27,79,60,0.1)' : 'transparent', color: active ? '#1B4F3C' : '#707974', fontSize: 12, cursor: 'pointer' }}>
                        {tag}
                      </button>
                    )
                  })}
                </div>

                {/* Note */}
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B4F3C' }}>Note</p>
                <textarea
                  value={editFields.note}
                  onChange={e => setEditFields((p: any) => ({ ...p, note: e.target.value }))}
                  placeholder="Optional"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#F9F9F9', border: '1px solid #C0C9C2', borderRadius: 2, padding: '11px 14px', color: '#1A1C1C', fontSize: 14, marginBottom: 20, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />

                <button onClick={handleSaveEdit} disabled={saving || !editFields.dish_name.trim()} style={{ width: '100%', padding: '14px 0', borderRadius: 4, border: 'none', background: saving ? '#C0C9C2' : '#1B4F3C', color: 'white', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {shareLog && (
        <ShareCard
          log={shareLog}
          userName={displayName}
          onClose={() => setShareLog(null)}
        />
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <BottomNav activePage="profile" onPlusClick={() => router.push('/map')} />
    </div>
  )
}
