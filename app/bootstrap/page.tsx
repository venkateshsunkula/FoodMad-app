'use client'

import { useState } from 'react'

// Popular Hyderabad neighborhoods with their coordinates
const NEIGHBORHOODS = [
  { label: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
  { label: 'Jubilee Hills', lat: 17.4325, lng: 78.4072 },
  { label: 'Hitech City', lat: 17.4435, lng: 78.3772 },
  { label: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
  { label: 'Kukatpally', lat: 17.4849, lng: 78.3996 },
  { label: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
  { label: 'Begumpet', lat: 17.4445, lng: 78.4637 },
  { label: 'Ameerpet', lat: 17.4374, lng: 78.4487 },
  { label: 'SR Nagar', lat: 17.4488, lng: 78.4365 },
  { label: 'Madhapur', lat: 17.4494, lng: 78.3912 },
  { label: 'Kondapur', lat: 17.4607, lng: 78.3567 },
  { label: 'Manikonda', lat: 17.4053, lng: 78.3870 },
  { label: 'Tolichowki', lat: 17.4052, lng: 78.4217 },
  { label: 'Mehdipatnam', lat: 17.3967, lng: 78.4398 },
  { label: 'LB Nagar', lat: 17.3489, lng: 78.5498 },
  { label: 'Dilsukhnagar', lat: 17.3688, lng: 78.5268 },
  { label: 'KPHB', lat: 17.4891, lng: 78.3926 },
  { label: 'Miyapur', lat: 17.4963, lng: 78.3523 },
]

type Result = {
  ok: boolean
  total_found: number
  inserted: number
  skipped: number
  city: string
  center: { lat: string; lng: string }
  radius_m: string
  error?: string
}

export default function BootstrapPage() {
  const [lat, setLat] = useState('17.4156')
  const [lng, setLng] = useState('78.4347')
  const [radius, setRadius] = useState('1500')
  const [city, setCity] = useState('Hyderabad')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [log, setLog] = useState<string[]>([])

  function pickNeighborhood(n: typeof NEIGHBORHOODS[0]) {
    setLat(String(n.lat))
    setLng(String(n.lng))
    setLog([])
    setResult(null)
  }

  async function runBootstrap() {
    setLoading(true)
    setResult(null)
    setLog(prev => [...prev, `Running for (${lat}, ${lng}) radius=${radius}m city=${city}...`])

    try {
      const res = await fetch(`/api/bootstrap?lat=${lat}&lng=${lng}&radius=${radius}&city=${encodeURIComponent(city)}`)
      const data: Result = await res.json()
      setResult(data)
      if (data.ok) {
        setLog(prev => [...prev, `Done: ${data.inserted} inserted, ${data.skipped} skipped (${data.total_found} found from Google)`])
      } else {
        setLog(prev => [...prev, `Error: ${data.error ?? 'unknown error'}`])
      }
    } catch (e: any) {
      setLog(prev => [...prev, `Network error: ${e.message}`])
    } finally {
      setLoading(false)
    }
  }

  async function runAll() {
    setLoading(true)
    setResult(null)
    setLog([])

    for (const n of NEIGHBORHOODS) {
      setLog(prev => [...prev, `→ ${n.label}...`])
      try {
        const res = await fetch(`/api/bootstrap?lat=${n.lat}&lng=${n.lng}&radius=1500&city=${encodeURIComponent(city)}`)
        const data: Result = await res.json()
        if (data.ok) {
          setLog(prev => [...prev, `  ✓ ${n.label}: ${data.inserted} inserted, ${data.skipped} skipped`])
        } else {
          setLog(prev => [...prev, `  ✗ ${n.label}: ${data.error ?? 'error'}`])
        }
        // Small pause between neighborhoods to avoid rate limits
        await new Promise(r => setTimeout(r, 3000))
      } catch (e: any) {
        setLog(prev => [...prev, `  ✗ ${n.label}: ${e.message}`])
      }
    }

    setLoading(false)
    setLog(prev => [...prev, '✅ All done!'])
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', padding: '24px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Bootstrap Restaurants</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#9CA3AF' }}>
        Pulls restaurant data from Google Places and adds them to your Supabase vendors table.
      </p>

      {/* Quick-pick neighborhoods */}
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>Quick-pick a neighborhood (Hyderabad)</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {NEIGHBORHOODS.map(n => (
          <button
            key={n.label}
            onClick={() => pickNeighborhood(n)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              border: lat === String(n.lat) ? '1px solid #F59E0B' : '1px solid #333',
              background: lat === String(n.lat) ? '#F59E0B22' : '#1a1a1a',
              color: lat === String(n.lat) ? '#F59E0B' : '#9CA3AF',
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Manual inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Latitude</label>
          <input
            value={lat}
            onChange={e => setLat(e.target.value)}
            style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Longitude</label>
          <input
            value={lng}
            onChange={e => setLng(e.target.value)}
            style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Radius (metres)</label>
          <input
            value={radius}
            onChange={e => setRadius(e.target.value)}
            style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: 'white', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={runBootstrap}
          disabled={loading}
          style={{
            flex: 1, padding: 13, borderRadius: 10, border: 'none',
            background: loading ? '#333' : '#F59E0B',
            color: loading ? '#666' : 'black',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Running...' : 'Run for this location'}
        </button>
        <button
          onClick={runAll}
          disabled={loading}
          style={{
            flex: 1, padding: 13, borderRadius: 10,
            border: loading ? '1px solid #333' : '1px solid #F59E0B',
            background: 'transparent',
            color: loading ? '#666' : '#F59E0B',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}
        >
          Run all neighborhoods
        </button>
      </div>

      {/* Result card */}
      {result && result.ok && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { value: result.total_found, label: 'Found' },
              { value: result.inserted, label: 'Inserted' },
              { value: result.skipped, label: 'Skipped' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{s.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 14 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Log</p>
          {log.map((line, i) => (
            <p key={i} style={{ margin: '0 0 4px', fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace' }}>
              {line}
            </p>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, padding: '14px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #222' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
          <strong style={{ color: '#9CA3AF' }}>How it works:</strong> Each run fetches up to 60 restaurants from Google Places (3 pages × 20 results) within the given radius. Duplicate names are skipped. Run each neighborhood once — running again won't re-add the same restaurants.
        </p>
      </div>
    </div>
  )
}
