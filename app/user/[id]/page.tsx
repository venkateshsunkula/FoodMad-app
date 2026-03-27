'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/bottom-nav'

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [authUser, setAuthUser] = useState<any>(null)
  const [profileUser, setProfileUser] = useState<any>(null)
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [vendorCount, setVendorCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (id) init() }, [id])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUser(user)

    const [{ data: profile }, { data: logs }, { count }] = await Promise.all([
      supabase.from('users').select('*').eq('id', id).single(),
      supabase.from('meal_logs').select('*, vendors(name)').eq('user_id', id).order('logged_at', { ascending: false }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('added_by', id),
    ])

    setProfileUser(profile)
    setMealLogs(logs ?? [])
    setVendorCount(count ?? 0)

    // Check if current user follows this profile
    if (user && user.id !== id) {
      const { data: followData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .single()
      setIsFollowing(!!followData)
    }

    setLoading(false)
  }

  async function toggleFollow() {
    if (!authUser || followLoading) return
    setFollowLoading(true)

    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', id)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({
        follower_id: authUser.id,
        following_id: id,
        created_at: new Date().toISOString(),
      })
      // Notify the person being followed
      await supabase.from('notifications').insert({
        user_id: id,
        type: 'follow',
        from_user_id: authUser.id,
      })
      setIsFollowing(true)
    }

    setFollowLoading(false)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const uniqueDishes = new Set(mealLogs.map(l => l.dish_name?.toLowerCase())).size
  const isOwnProfile = authUser?.id === id

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>User not found.</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0, marginRight: 12 }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>{profileUser.name}</h2>
        <button
          onClick={handleCopyLink}
          style={{ background: 'none', border: '1px solid #333', color: '#9CA3AF', fontSize: 12, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}
        >
          {copied ? '✓ Copied!' : 'Share'}
        </button>
      </div>

      {/* Profile section */}
      <div style={{ padding: '24px 20px', textAlign: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          margin: '0 auto 14px',
          border: '2px solid #F59E0B',
          overflow: 'hidden', background: '#333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <span style={{ fontSize: 32, position: 'absolute' }}>{(profileUser.name || '?')[0].toUpperCase()}</span>
          {profileUser.avatar_url && (
            <img
              src={profileUser.avatar_url}
              alt=""
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            />
          )}
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{profileUser.name}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#9CA3AF' }}>{profileUser.city || 'No city set'}</p>

        {/* Follow button — only show if viewing someone else's profile */}
        {!isOwnProfile && authUser && (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            style={{
              padding: '10px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              border: isFollowing ? '1px solid #333' : 'none',
              background: isFollowing ? 'transparent' : '#F59E0B',
              color: isFollowing ? '#9CA3AF' : 'black',
            }}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {!isOwnProfile && !authUser && (
          <p style={{ fontSize: 13, color: '#6B7280' }}>Sign in to follow</p>
        )}

        {isOwnProfile && (
          <button
            onClick={() => router.push('/profile')}
            style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14, border: '1px solid #333', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}
          >
            Edit profile
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
        {[
          { value: mealLogs.length, label: 'meals' },
          { value: vendorCount, label: 'discovered' },
          { value: uniqueDishes, label: 'dishes' },
        ].map((stat, i) => (
          <div key={i} style={{ flex: 1, padding: '18px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid #1a1a1a' : 'none' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{stat.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Meals grid */}
      <div style={{ padding: '20px 16px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#9CA3AF' }}>Meals</p>
        {mealLogs.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 32 }}>No meals logged yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {mealLogs.map(log => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{ background: '#1a1a1a', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #222' }}
              >
                <div style={{ aspectRatio: '1', position: 'relative', background: '#111' }}>
                  {log.photo_url ? (
                    <img src={log.photo_url} alt={log.dish_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍽️</div>
                  )}
                  <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '2px 6px', fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>
                    {'★'.repeat(log.rating)}
                  </div>
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.dish_name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.vendors?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              <img src={selectedLog.photo_url} alt={selectedLog.dish_name} style={{ width: '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover', marginBottom: 16, display: 'block' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedLog.dish_name}</h3>
              <span style={{ color: '#F59E0B', fontSize: 15, fontWeight: 700, marginLeft: 8 }}>
                {'★'.repeat(selectedLog.rating)}{'☆'.repeat(5 - selectedLog.rating)}
              </span>
            </div>
            <p style={{ margin: '0 0 4px', color: '#9CA3AF', fontSize: 14 }}>{selectedLog.vendors?.name}</p>
            {selectedLog.price_inr && <p style={{ margin: '0 0 12px', color: '#9CA3AF', fontSize: 14 }}>₹{selectedLog.price_inr}</p>}
            {selectedLog.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {selectedLog.tags.map((tag: string) => (
                  <span key={tag} style={{ background: '#333', padding: '4px 10px', borderRadius: 16, fontSize: 12, color: '#E5E7EB' }}>{tag}</span>
                ))}
              </div>
            )}
            {selectedLog.note && <p style={{ margin: '0 0 12px', color: '#E5E7EB', fontSize: 14, lineHeight: 1.6 }}>{selectedLog.note}</p>}
          </div>
        </div>
      )}

      <BottomNav activePage="feed" onPlusClick={() => router.push('/')} />
    </div>
  )
}
