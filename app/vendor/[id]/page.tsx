'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/bottom-nav'

function timeAgo(dateStr: string) {
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

export default function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [vendor, setVendor] = useState<any>(null)
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimDone, setClaimDone] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingBookmark, setSavingBookmark] = useState(false)
  const [editHours, setEditHours] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => { if (id) init() }, [id])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUserId(user?.id ?? null)

    const [{ data: v }, { data: logs }, { data: savedRow }] = await Promise.all([
      supabase
        .from('vendors')
        .select('*, users!added_by(id, name), claimer:users!claimed_by(id, name)')
        .eq('id', id)
        .single(),
      supabase
        .from('meal_logs')
        .select('*, users!user_id(id, name, avatar_url)')
        .eq('vendor_id', id)
        .order('logged_at', { ascending: false }),
      user ? supabase.from('saved_vendors').select('vendor_id').eq('user_id', user.id).eq('vendor_id', id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    setVendor(v)
    setEditHours(v?.hours ?? '')
    setEditPhone(v?.phone ?? '')
    setMealLogs(logs ?? [])
    setSaved(!!savedRow)
    setLoading(false)
  }

  async function toggleSave() {
    if (!authUserId) return
    setSavingBookmark(true)
    if (saved) {
      await supabase.from('saved_vendors').delete().eq('user_id', authUserId).eq('vendor_id', id)
      setSaved(false)
    } else {
      await supabase.from('saved_vendors').insert({ user_id: authUserId, vendor_id: id })
      setSaved(true)
    }
    setSavingBookmark(false)
  }

  async function handleClaim() {
    if (!authUserId || !vendor) return
    setClaiming(true)
    const { error } = await supabase
      .from('vendors')
      .update({ claimed_by: authUserId })
      .eq('id', id)
    if (!error) {
      setVendor((v: any) => ({ ...v, claimed_by: authUserId }))
      setClaimDone(true)
    }
    setClaiming(false)
  }

  async function handleSaveEdits() {
    setSaving(true)
    const { error } = await supabase
      .from('vendors')
      .update({ hours: editHours || null, phone: editPhone || null })
      .eq('id', id)
    if (!error) {
      setVendor((v: any) => ({ ...v, hours: editHours || null, phone: editPhone || null }))
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleCoverPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !authUserId) return
    setPhotoUploading(true)
    try {
      // Compress: draw to canvas at max 1200px wide
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = URL.createObjectURL(file)
      })
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.85))

      const path = `vendor-covers/${id}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      await supabase.from('vendors').update({ photo_url: publicUrl }).eq('id', id)
      setVendor((v: any) => ({ ...v, photo_url: publicUrl }))
    } catch {
      alert('Photo upload failed. Try again.')
    }
    setPhotoUploading(false)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #333', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Vendor not found.</p>
      </div>
    )
  }

  const avgRating = mealLogs.length
    ? (mealLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / mealLogs.length).toFixed(1)
    : null

  const dishCounts: Record<string, { count: number; rating: number }> = {}
  mealLogs.forEach(l => {
    if (l.dish_name) {
      const key = l.dish_name.toLowerCase()
      if (!dishCounts[key]) dishCounts[key] = { count: 0, rating: 0 }
      dishCounts[key].count++
      dishCounts[key].rating += l.rating || 0
    }
  })
  const topDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)

  const photos = mealLogs.filter(l => l.photo_url)
  const heroPhoto = photos[0]?.photo_url ?? null
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`
  const isManual = vendor.source === 'manual'
  const uniqueDishes = Object.keys(dishCounts).length

  const isClaimed = !!vendor.claimed_by
  const isVerified = !!vendor.is_verified
  const isOwner = authUserId && vendor.claimed_by === authUserId
  const canClaim = authUserId && !isClaimed && !claimDone
  const claimerName = (vendor.claimer as any)?.name ?? null

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 100 }}>

      {/* Hero */}
      <div style={{ position: 'relative', height: 260 }}>
        {heroPhoto ? (
          <img src={heroPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.3) 60%, transparent 100%)' }} />

        {/* Back + Share */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {authUserId && (
              <button
                onClick={toggleSave}
                disabled={savingBookmark}
                style={{ width: 36, height: 36, borderRadius: '50%', background: saved ? 'rgba(245,158,11,0.3)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: `1px solid ${saved ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`, color: saved ? '#F59E0B' : 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {saved ? '★' : '☆'}
              </button>
            )}
            <button onClick={handleShare} style={{ padding: '8px 14px', borderRadius: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {copied ? '✓ Copied' : 'Share'}
            </button>
          </div>
        </div>

        {/* Vendor name overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              background: isManual ? '#F59E0B' : '#4B5563',
              color: isManual ? 'black' : 'white',
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {isManual ? 'Street Vendor' : 'Restaurant'}
            </span>
            {avgRating && (
              <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                ★ {avgRating}
              </span>
            )}
            {(isClaimed || isVerified) && (
              <span style={{
                background: isVerified ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(245,158,11,0.15)',
                border: isVerified ? 'none' : '1px solid rgba(245,158,11,0.4)',
                color: isVerified ? 'black' : '#F59E0B',
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {isVerified ? '✓ Verified' : '✓ Claimed'}
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, fontStyle: 'italic', lineHeight: 1.2 }}>{vendor.name}</h1>
          {(vendor.neighborhood || vendor.city) && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              📍 {[vendor.neighborhood, vendor.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 640, margin: '0 auto' }}>

        {/* Stats row */}
        {mealLogs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '16px 0' }}>
            {[
              { label: 'Avg Rating', value: avgRating ? `${avgRating}★` : '—' },
              { label: 'Meals Logged', value: mealLogs.length },
              { label: 'Dishes', value: uniqueDishes },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: '#F59E0B' }}>{stat.value}</p>
                <p style={{ margin: 0, fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => router.push('/map?log=1')}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#F59E0B', color: 'black', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            🍽️ Log a meal here
          </button>
          {vendor.lat && vendor.lng && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '13px 16px', borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#9CA3AF', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              ↗ Directions
            </a>
          )}
        </div>

        {/* Claim this spot */}
        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, marginBottom: 16,
              border: '1px solid rgba(245,158,11,0.35)',
              background: 'rgba(245,158,11,0.07)',
              color: claiming ? '#6B7280' : '#F59E0B',
              fontSize: 14, fontWeight: 700, cursor: claiming ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {claiming ? (
              <><span style={{ width: 14, height: 14, border: '2px solid #6B7280', borderTopColor: '#F59E0B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Claiming…</>
            ) : (
              '🏷️ Is this your place? Claim it'
            )}
          </button>
        )}

        {claimDone && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>✓ You've claimed this spot! Verification coming soon.</p>
          </div>
        )}

        {/* Owner edit panel */}
        {isOwner && !claimDone && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? 14 : 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>🏷️ You own this spot</p>
              <button
                onClick={() => setEditing(e => !e)}
                style={{ background: 'none', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {editing ? 'Cancel' : 'Edit details'}
              </button>
            </div>
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Cover photo */}
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cover Photo</p>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px', borderRadius: 10, border: '1px dashed #333',
                    background: '#111', color: photoUploading ? '#6B7280' : '#9CA3AF',
                    fontSize: 13, fontWeight: 600, cursor: photoUploading ? 'default' : 'pointer',
                  }}>
                    {photoUploading ? (
                      <><span style={{ width: 14, height: 14, border: '2px solid #444', borderTopColor: '#F59E0B', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Uploading…</>
                    ) : (
                      <>📷 {vendor.photo_url ? 'Change cover photo' : 'Upload cover photo'}</>
                    )}
                    <input type="file" accept="image/*" capture="environment" onChange={handleCoverPhoto} style={{ display: 'none' }} disabled={photoUploading} />
                  </label>
                </div>

                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hours</p>
                  <input
                    value={editHours}
                    onChange={e => setEditHours(e.target.value)}
                    placeholder="e.g. Mon–Sat, 7am–3pm"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</p>
                  <input
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  style={{ padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? '#D97706' : '#F59E0B', color: 'black', fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tags + hours */}
        {(vendor.cuisine_tags?.length > 0 || vendor.hours || vendor.phone) && (
          <div style={{ marginBottom: 20 }}>
            {vendor.hours && (
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6B7280' }}>🕐 {vendor.hours}</p>
            )}
            {vendor.phone && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6B7280' }}>📞 {vendor.phone}</p>
            )}
            {vendor.cuisine_tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {vendor.cuisine_tags.map((tag: string) => (
                  <span key={tag} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', padding: '5px 12px', borderRadius: 20, fontSize: 12, color: '#9CA3AF' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Claimed by / Discoverer */}
        {isClaimed && claimerName && !isOwner && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏷️</span>
            <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
              Managed by{' '}
              <Link href={`/user/${vendor.claimed_by}`} style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 700 }}>
                {claimerName}
              </Link>
            </p>
          </div>
        )}

        {isManual && vendor.users?.name && (
          <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
              Discovered by{' '}
              <Link href={`/user/${vendor.users.id}`} style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 700 }}>
                {vendor.users.name}
              </Link>
            </p>
          </div>
        )}

        {/* Top dishes */}
        {topDishes.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
              Popular Dishes
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {topDishes.map(([name, data], i) => (
                <div key={name} style={{
                  background: i === 0 ? 'rgba(245,158,11,0.12)' : '#1a1a1a',
                  border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.3)' : '#252525'}`,
                  borderRadius: 20, padding: '7px 14px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 12 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🍽️'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#F59E0B' : 'white', textTransform: 'capitalize' }}>{name}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{data.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo strip */}
        {photos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
              Photos
            </p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, margin: '0 -16px', paddingLeft: 16, paddingRight: 16 }}>
              {photos.map(log => (
                <div key={log.id} onClick={() => setSelectedLog(log)} style={{ flexShrink: 0, cursor: 'pointer' }}>
                  <img
                    src={log.photo_url}
                    alt={log.dish_name}
                    style={{ width: 120, height: 120, borderRadius: 12, objectFit: 'cover', display: 'block', border: '1px solid #252525' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {vendor.lat && vendor.lng && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
              Location
            </p>
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <div style={{ height: 180, borderRadius: 16, overflow: 'hidden', border: '1px solid #252525' }}>
                <Map
                  defaultCenter={{ lat: vendor.lat, lng: vendor.lng }}
                  defaultZoom={16}
                  mapId="foodmad-vendor-detail"
                  style={{ width: '100%', height: '100%' }}
                  disableDefaultUI
                  gestureHandling="none"
                >
                  <AdvancedMarker position={{ lat: vendor.lat, lng: vendor.lng }}>
                    <Pin background="#F59E0B" borderColor="#D97706" glyphColor="#fff" />
                  </AdvancedMarker>
                </Map>
              </div>
            </APIProvider>
          </div>
        )}

        {/* Meal logs */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#F59E0B' }}>
            {mealLogs.length > 0 ? `Recent Meals (${mealLogs.length})` : 'No Meals Yet'}
          </p>
          {mealLogs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🍽️</p>
              <p style={{ fontSize: 14 }}>Be the first to log a meal here</p>
            </div>
          )}
          {mealLogs.map(log => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, marginBottom: 10, overflow: 'hidden', display: 'flex', cursor: 'pointer' }}
            >
              {log.photo_url && (
                <img src={log.photo_url} alt={log.dish_name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{log.dish_name}</p>
                  <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{'★'.repeat(log.rating)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {log.users?.name && (
                    <Link href={`/user/${log.users.id}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
                      {log.users.name}
                    </Link>
                  )}
                  {log.price_inr && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· ₹{log.price_inr}</span>}
                  <span style={{ fontSize: 11, color: '#444', marginLeft: 'auto' }}>{timeAgo(log.logged_at)}</span>
                </div>
                {log.note && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{log.note}"</p>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Detail sheet */}
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
            {selectedLog.users?.name && (
              <p style={{ margin: '0 0 4px', color: '#6B7280', fontSize: 13 }}>by {selectedLog.users.name}</p>
            )}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <BottomNav activePage="map" onPlusClick={() => router.push('/map')} />
    </div>
  )
}
