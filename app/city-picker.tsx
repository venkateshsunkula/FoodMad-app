'use client'

import { useState } from 'react'

const CITIES = [
  'Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Surat', 'Kochi', 'Visakhapatnam', 'Bhopal', 'Chandigarh',
  'Guntur', 'Vijayawada', 'Indore', 'Nagpur', 'Coimbatore',
]

export default function CityPicker({
  onSelect,
}: {
  onSelect: (city: string) => void
}) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')

  const city = selected || custom.trim()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%',
        background: '#1a1a1a',
        borderRadius: '16px 16px 0 0',
        padding: '28px 20px 40px',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 22, color: 'white' }}>What city are you in?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#9CA3AF' }}>
          We'll show vendors near you.
        </p>

        {/* City chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => { setSelected(c); setCustom('') }}
              style={{
                padding: '8px 14px',
                borderRadius: 20,
                fontSize: 14,
                cursor: 'pointer',
                border: selected === c ? '1px solid #F59E0B' : '1px solid #333',
                background: selected === c ? '#F59E0B22' : '#111',
                color: selected === c ? '#F59E0B' : '#9CA3AF',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Custom city input */}
        <input
          type="text"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected('') }}
          placeholder="My city isn't listed..."
          style={{
            width: '100%',
            padding: 12,
            background: '#111',
            border: '1px solid #333',
            borderRadius: 8,
            color: 'white',
            fontSize: 15,
            marginBottom: 20,
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={() => { if (city) onSelect(city) }}
          disabled={!city}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 10,
            border: 'none',
            background: city ? '#F59E0B' : '#333',
            color: city ? 'black' : '#666',
            fontSize: 16,
            fontWeight: 700,
            cursor: city ? 'pointer' : 'default',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
