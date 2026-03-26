'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { supabase } from '../../lib/supabase'
import BottomNav from '../../components/bottom-nav'

export default function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [vendor, setVendor] = useState<any>(null)
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) init()
  }, [id])

  async function init() {
    const [{ data: v }, { data: logs }] = await Promise.all([
      supabase.from('vendors').select('*, users!added_by(name)').eq('id', id).single(),
      supabase
        .from('meal_logs')
        .select('*, users!user_id(name)')
        .eq('vendor_id', id)
        .order('logged_at', { ascending: false }),
    ])
    setVendor(v)
    setMealLogs(logs ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
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

  // Average rating
  const avgRating = mealLogs.length
    ? (mealLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / mealLogs.length).toFixed(1)
    : null

  // Top dishes
  const dishCounts: Record<string, number> = {}
  mealLogs.forEach(l => {
    if (l.dish_name) {
      const key = l.dish_name.toLowerCase()
      dishCounts[key] = (dishCounts[key] || 0) + 1
    }
  })
  const topDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Photos
  const photos = mealLogs.filter(l => l.photo_url)

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vendor.name}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9CA3AF', textTransform: 'capitalize' }}>
            {vendor.type?.replace(/_/g, ' ')}
          </p>
        </div>
        <span style={{
          background: vendor.source === 'manual' ? '#F59E0B' : '#6B7280',
          color: 'black', padding: '3px 10px',
          borderRadius: 12, fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {vendor.source === 'manual' ? 'Vendor' : 'Restaurant'}
        </span>
      </div>

      {/* Map */}
      {vendor.lat && vendor.lng && (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <div style={{ height: 200, position: 'relative' }}>
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
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute', bottom: 12, right: 12,
                background: '#F59E0B', color: 'black',
                padding: '8px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Directions ↗
            </a>
          </div>
        </APIProvider>
      )}

      {/* Info */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
        {vendor.hours && (
          <p style={{ margin: '0 0 10px', fontSize: 14, color: '#9CA3AF' }}>🕐 {vendor.hours}</p>
        )}
        {vendor.cuisine_tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {vendor.cuisine_tags.map((tag: string) => (
              <span key={tag} style={{
                background: '#1a1a1a', border: '1px solid #333',
                padding: '4px 10px', borderRadius: 16, fontSize: 12, color: '#E5E7EB',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {vendor.source === 'manual' && vendor.users?.name && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            📍 Discovered by <span style={{ color: '#F59E0B' }}>{vendor.users.name}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      {mealLogs.length > 0 && (
        <div style={{ display: 'flex', gap: 24, padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>⭐ {avgRating}</span>
            <span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 6 }}>avg</span>
          </div>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>{mealLogs.length}</span>
            <span style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 6 }}>meals logged</span>
          </div>
        </div>
      )}

      {/* Top dishes */}
      {topDishes.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>Top dishes</p>
          {topDishes.map(([name, count], i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: 'white', textTransform: 'capitalize' }}>
                {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '    '}{name}
              </span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>{count}×</span>
            </div>
          ))}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>Photos</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {photos.map(log => (
              <img
                key={log.id}
                src={log.photo_url}
                alt={log.dish_name}
                style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Meal logs */}
      <div style={{ padding: '16px 20px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>
          {mealLogs.length > 0 ? 'Recent meals' : 'No meals logged here yet'}
        </p>
        {mealLogs.map(log => (
          <div key={log.id} style={{
            background: '#1a1a1a', border: '1px solid #222',
            borderRadius: 10, padding: '12px 14px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{log.dish_name}</p>
                {log.users?.name && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>by {log.users.name}</p>
                )}
              </div>
              <span style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {'★'.repeat(log.rating)}
              </span>
            </div>
            {log.price_inr && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>₹{log.price_inr}</p>
            )}
            {log.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {log.tags.map((tag: string) => (
                  <span key={tag} style={{ background: '#333', padding: '3px 8px', borderRadius: 12, fontSize: 11, color: '#9CA3AF' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {log.note && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#E5E7EB', lineHeight: 1.5 }}>{log.note}</p>
            )}
          </div>
        ))}
      </div>

      <BottomNav activePage="map" onPlusClick={() => router.push('/')} />
    </div>
  )
}
