'use client'

import { useState } from 'react'

const CITIES: Record<string, { neighborhoods: { label: string; lat: number; lng: number }[] }> = {
  Hyderabad: {
    neighborhoods: [
      { label: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
      { label: 'Jubilee Hills', lat: 17.4325, lng: 78.4072 },
      { label: 'Hitech City', lat: 17.4435, lng: 78.3772 },
      { label: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
      { label: 'Kukatpally', lat: 17.4849, lng: 78.3996 },
      { label: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
      { label: 'Begumpet', lat: 17.4445, lng: 78.4637 },
      { label: 'Ameerpet', lat: 17.4374, lng: 78.4487 },
      { label: 'Madhapur', lat: 17.4494, lng: 78.3912 },
      { label: 'Kondapur', lat: 17.4607, lng: 78.3567 },
      { label: 'Manikonda', lat: 17.4053, lng: 78.3870 },
      { label: 'Tolichowki', lat: 17.4052, lng: 78.4217 },
      { label: 'Mehdipatnam', lat: 17.3967, lng: 78.4398 },
      { label: 'LB Nagar', lat: 17.3489, lng: 78.5498 },
      { label: 'Dilsukhnagar', lat: 17.3688, lng: 78.5268 },
      { label: 'KPHB', lat: 17.4891, lng: 78.3926 },
      { label: 'Miyapur', lat: 17.4963, lng: 78.3523 },
      { label: 'SR Nagar', lat: 17.4488, lng: 78.4365 },
    ],
  },
  Guntur: {
    neighborhoods: [
      { label: 'City Centre', lat: 16.3067, lng: 80.4365 },
      { label: 'Brodipet', lat: 16.3041, lng: 80.4336 },
      { label: 'Arundelpet', lat: 16.3009, lng: 80.4499 },
      { label: 'Kothapeta', lat: 16.3128, lng: 80.4412 },
      { label: 'Auto Nagar', lat: 16.3183, lng: 80.4615 },
      { label: 'Amaravati Road', lat: 16.3313, lng: 80.4176 },
      { label: 'Naaz Centre', lat: 16.3075, lng: 80.4395 },
      { label: 'Chandramouli Nagar', lat: 16.2946, lng: 80.4282 },
    ],
  },
  Bangalore: {
    neighborhoods: [
      { label: 'Koramangala', lat: 12.9352, lng: 77.6245 },
      { label: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
      { label: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
      { label: 'Whitefield', lat: 12.9698, lng: 77.7499 },
      { label: 'MG Road', lat: 12.9756, lng: 77.6197 },
      { label: 'Jayanagar', lat: 12.9260, lng: 77.5937 },
      { label: 'JP Nagar', lat: 12.9098, lng: 77.5848 },
      { label: 'Marathahalli', lat: 12.9591, lng: 77.6971 },
      { label: 'Malleshwaram', lat: 13.0034, lng: 77.5668 },
      { label: 'Electronic City', lat: 12.8399, lng: 77.6770 },
      { label: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
      { label: 'Banashankari', lat: 12.9257, lng: 77.5465 },
      { label: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
      { label: 'Rajajinagar', lat: 12.9984, lng: 77.5542 },
      { label: 'Hebbal', lat: 13.0354, lng: 77.5970 },
    ],
  },
  Delhi: {
    neighborhoods: [
      { label: 'Connaught Place', lat: 28.6280, lng: 77.2090 },
      { label: 'Lajpat Nagar', lat: 28.5677, lng: 77.2433 },
      { label: 'Saket', lat: 28.5244, lng: 77.2066 },
      { label: 'Karol Bagh', lat: 28.6508, lng: 77.1905 },
      { label: 'Chandni Chowk', lat: 28.6562, lng: 77.2300 },
      { label: 'Hauz Khas', lat: 28.5494, lng: 77.2001 },
      { label: 'Paharganj', lat: 28.6446, lng: 77.2121 },
      { label: 'Dwarka', lat: 28.5733, lng: 77.0151 },
      { label: 'Rohini', lat: 28.7322, lng: 77.1166 },
      { label: 'Vasant Kunj', lat: 28.5218, lng: 77.1587 },
      { label: 'Noida Sector 18', lat: 28.5706, lng: 77.3219 },
      { label: 'Gurugram', lat: 28.4595, lng: 77.0266 },
      { label: 'Janakpuri', lat: 28.6219, lng: 77.0839 },
      { label: 'Pitampura', lat: 28.7003, lng: 77.1305 },
      { label: 'Preet Vihar', lat: 28.6436, lng: 77.2964 },
    ],
  },
  Chennai: {
    neighborhoods: [
      { label: 'T Nagar', lat: 13.0418, lng: 80.2341 },
      { label: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
      { label: 'Adyar', lat: 13.0067, lng: 80.2557 },
      { label: 'Velachery', lat: 12.9750, lng: 80.2209 },
      { label: 'Mylapore', lat: 13.0341, lng: 80.2699 },
      { label: 'Besant Nagar', lat: 13.0002, lng: 80.2688 },
      { label: 'Nungambakkam', lat: 13.0569, lng: 80.2424 },
      { label: 'Vadapalani', lat: 13.0525, lng: 80.2124 },
      { label: 'Tambaram', lat: 12.9249, lng: 80.1000 },
      { label: 'Porur', lat: 13.0362, lng: 80.1572 },
      { label: 'Perambur', lat: 13.1148, lng: 80.2338 },
      { label: 'OMR', lat: 12.9010, lng: 80.2279 },
      { label: 'Guindy', lat: 13.0069, lng: 80.2206 },
      { label: 'Chrompet', lat: 12.9516, lng: 80.1462 },
    ],
  },
  Mumbai: {
    neighborhoods: [
      { label: 'Bandra', lat: 19.0544, lng: 72.8402 },
      { label: 'Andheri', lat: 19.1197, lng: 72.8472 },
      { label: 'Lower Parel', lat: 18.9947, lng: 72.8240 },
      { label: 'Juhu', lat: 19.1010, lng: 72.8270 },
      { label: 'Powai', lat: 19.1197, lng: 72.9050 },
      { label: 'Dadar', lat: 19.0176, lng: 72.8448 },
      { label: 'Borivali', lat: 19.2288, lng: 72.8567 },
      { label: 'Kurla', lat: 19.0726, lng: 72.8797 },
      { label: 'Malad', lat: 19.1887, lng: 72.8483 },
      { label: 'Thane', lat: 19.2183, lng: 72.9781 },
      { label: 'Colaba', lat: 18.9067, lng: 72.8147 },
      { label: 'Goregaon', lat: 19.1663, lng: 72.8526 },
      { label: 'Versova', lat: 19.1313, lng: 72.8198 },
    ],
  },
  Pune: {
    neighborhoods: [
      { label: 'FC Road', lat: 18.5236, lng: 73.8478 },
      { label: 'Koregaon Park', lat: 18.5362, lng: 73.8936 },
      { label: 'Camp', lat: 18.5195, lng: 73.8553 },
      { label: 'Kothrud', lat: 18.5074, lng: 73.8077 },
      { label: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
      { label: 'Baner', lat: 18.5590, lng: 73.7868 },
      { label: 'Hinjewadi', lat: 18.5912, lng: 73.7389 },
      { label: 'Aundh', lat: 18.5583, lng: 73.8108 },
      { label: 'Wakad', lat: 18.5982, lng: 73.7602 },
      { label: 'Hadapsar', lat: 18.5089, lng: 73.9260 },
      { label: 'Shivajinagar', lat: 18.5308, lng: 73.8474 },
      { label: 'Kalyani Nagar', lat: 18.5461, lng: 73.9018 },
    ],
  },
  Kolkata: {
    neighborhoods: [
      { label: 'Park Street', lat: 22.5531, lng: 88.3527 },
      { label: 'Salt Lake', lat: 22.5726, lng: 88.4162 },
      { label: 'New Town', lat: 22.5958, lng: 88.4897 },
      { label: 'Ballygunge', lat: 22.5204, lng: 88.3643 },
      { label: 'Gariahat', lat: 22.5151, lng: 88.3676 },
      { label: 'Howrah', lat: 22.5958, lng: 88.2636 },
      { label: 'Dum Dum', lat: 22.6542, lng: 88.3944 },
      { label: 'Jadavpur', lat: 22.4968, lng: 88.3722 },
      { label: 'Behala', lat: 22.4904, lng: 88.3098 },
    ],
  },
  Ahmedabad: {
    neighborhoods: [
      { label: 'CG Road', lat: 23.0225, lng: 72.5714 },
      { label: 'Navrangpura', lat: 23.0302, lng: 72.5604 },
      { label: 'SG Highway', lat: 23.0395, lng: 72.5064 },
      { label: 'Satellite', lat: 23.0105, lng: 72.5148 },
      { label: 'Bodakdev', lat: 23.0567, lng: 72.5108 },
      { label: 'Vastrapur', lat: 23.0337, lng: 72.5297 },
      { label: 'Prahlad Nagar', lat: 23.0067, lng: 72.5050 },
      { label: 'Maninagar', lat: 22.9937, lng: 72.6006 },
      { label: 'Gota', lat: 23.1002, lng: 72.5350 },
    ],
  },
}

type Result = {
  ok: boolean
  total_found: number
  inserted: number
  skipped: number
  city: string
  error?: string
}

export default function BootstrapPage() {
  const [selectedCity, setSelectedCity] = useState('Hyderabad')
  const [lat, setLat] = useState('17.4156')
  const [lng, setLng] = useState('78.4347')
  const [radius, setRadius] = useState('1500')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [result, setResult] = useState<Result | null>(null)

  const neighborhoods = CITIES[selectedCity]?.neighborhoods ?? []

  function pickCity(city: string) {
    setSelectedCity(city)
    const first = CITIES[city]?.neighborhoods[0]
    if (first) { setLat(String(first.lat)); setLng(String(first.lng)) }
    setLog([]); setResult(null)
  }

  function pickNeighborhood(n: { lat: number; lng: number }) {
    setLat(String(n.lat)); setLng(String(n.lng))
    setLog([]); setResult(null)
  }

  async function runOne() {
    setLoading(true); setResult(null)
    setLog(prev => [...prev, `Running (${lat}, ${lng}) city=${selectedCity}...`])
    try {
      const res = await fetch(`/api/bootstrap?lat=${lat}&lng=${lng}&radius=${radius}&city=${encodeURIComponent(selectedCity)}`)
      const data: Result = await res.json()
      setResult(data)
      setLog(prev => [...prev, data.ok
        ? `✓ ${data.inserted} inserted, ${data.skipped} skipped (${data.total_found} found)`
        : `✗ ${data.error ?? 'error'}`])
    } catch (e: any) {
      setLog(prev => [...prev, `✗ Network error: ${e.message}`])
    }
    setLoading(false)
  }

  async function runCity() {
    setLoading(true); setResult(null); setLog([`Starting all ${neighborhoods.length} neighborhoods in ${selectedCity}...`])
    let totalInserted = 0, totalSkipped = 0
    for (const n of neighborhoods) {
      setLog(prev => [...prev, `→ ${n.label}...`])
      try {
        const res = await fetch(`/api/bootstrap?lat=${n.lat}&lng=${n.lng}&radius=${radius}&city=${encodeURIComponent(selectedCity)}`)
        const data: Result = await res.json()
        if (data.ok) {
          totalInserted += data.inserted; totalSkipped += data.skipped
          setLog(prev => [...prev, `  ✓ ${n.label}: ${data.inserted} inserted, ${data.skipped} skipped`])
        } else {
          setLog(prev => [...prev, `  ✗ ${n.label}: ${data.error ?? 'error'}`])
        }
      } catch (e: any) {
        setLog(prev => [...prev, `  ✗ ${n.label}: ${e.message}`])
      }
      await new Promise(r => setTimeout(r, 2500))
    }
    setLog(prev => [...prev, `✅ ${selectedCity} done! Total: ${totalInserted} inserted, ${totalSkipped} skipped`])
    setLoading(false)
  }

  async function runAllCities() {
    setLoading(true); setResult(null); setLog(['🚀 Running ALL cities...'])
    for (const [city, { neighborhoods: hoods }] of Object.entries(CITIES)) {
      setLog(prev => [...prev, `\n📍 ${city} (${hoods.length} neighborhoods)`])
      for (const n of hoods) {
        setLog(prev => [...prev, `  → ${n.label}...`])
        try {
          const res = await fetch(`/api/bootstrap?lat=${n.lat}&lng=${n.lng}&radius=${radius}&city=${encodeURIComponent(city)}`)
          const data: Result = await res.json()
          setLog(prev => [...prev, data.ok
            ? `    ✓ ${data.inserted} in, ${data.skipped} skip`
            : `    ✗ ${data.error}`])
        } catch (e: any) {
          setLog(prev => [...prev, `    ✗ ${e.message}`])
        }
        await new Promise(r => setTimeout(r, 2500))
      }
    }
    setLog(prev => [...prev, '\n🎉 All cities done!'])
    setLoading(false)
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', padding: '24px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Bootstrap Restaurants</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#9CA3AF' }}>
        Pull restaurant data from Google Places into Supabase. {Object.keys(CITIES).length} cities, {Object.values(CITIES).reduce((sum, c) => sum + c.neighborhoods.length, 0)} neighborhoods total.
      </p>

      {/* City selector */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F59E0B' }}>Select City</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.keys(CITIES).map(city => (
          <button key={city} onClick={() => pickCity(city)} style={{
            padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            border: selectedCity === city ? '1px solid #F59E0B' : '1px solid #333',
            background: selectedCity === city ? '#F59E0B' : '#1a1a1a',
            color: selectedCity === city ? 'black' : '#9CA3AF',
            fontWeight: selectedCity === city ? 700 : 400,
          }}>{city}</button>
        ))}
      </div>

      {/* Neighborhood picker */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F59E0B' }}>
        {selectedCity} Neighborhoods ({neighborhoods.length})
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {neighborhoods.map(n => (
          <button key={n.label} onClick={() => pickNeighborhood(n)} style={{
            padding: '6px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
            border: lat === String(n.lat) ? '1px solid #F59E0B' : '1px solid #333',
            background: lat === String(n.lat) ? '#F59E0B22' : '#1a1a1a',
            color: lat === String(n.lat) ? '#F59E0B' : '#9CA3AF',
          }}>{n.label}</button>
        ))}
      </div>

      {/* Manual inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {([['Latitude', lat, setLat], ['Longitude', lng, setLng], ['Radius (m)', radius, setRadius]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
          <div key={label}>
            <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>{label}</label>
            <input value={val} onChange={e => setter(e.target.value)}
              style={{ width: '100%', padding: 10, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: 'white', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <button onClick={runOne} disabled={loading} style={{
          flex: 1, padding: 12, borderRadius: 10, border: 'none',
          background: loading ? '#333' : '#F59E0B', color: loading ? '#666' : 'black',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        }}>{loading ? 'Running...' : 'Run this spot'}</button>
        <button onClick={runCity} disabled={loading} style={{
          flex: 1, padding: 12, borderRadius: 10, border: '1px solid #F59E0B',
          background: 'transparent', color: loading ? '#444' : '#F59E0B',
          fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        }}>Run all {selectedCity}</button>
      </div>
      <button onClick={runAllCities} disabled={loading} style={{
        width: '100%', padding: 13, borderRadius: 10, marginBottom: 24,
        border: '1px solid #333', background: loading ? '#111' : '#1a1a1a',
        color: loading ? '#444' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
      }}>
        🌍 Run ALL {Object.keys(CITIES).length} cities ({Object.values(CITIES).reduce((s, c) => s + c.neighborhoods.length, 0)} neighborhoods) — takes ~{Math.ceil(Object.values(CITIES).reduce((s, c) => s + c.neighborhoods.length, 0) * 2.5 / 60)} min
      </button>

      {/* Result */}
      {result?.ok && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 24 }}>
          {[['Found', result.total_found], ['Inserted', result.inserted], ['Skipped', result.skipped]].map(([l, v]) => (
            <div key={l}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{v}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: 14, maxHeight: 400, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Log</p>
          {log.map((line, i) => (
            <p key={i} style={{ margin: '0 0 3px', fontSize: 12, color: line.includes('✅') || line.includes('🎉') ? '#10B981' : line.includes('✗') ? '#EF4444' : '#9CA3AF', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
