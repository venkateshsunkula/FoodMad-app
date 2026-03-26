'use client'

import { useState, useRef, useEffect } from 'react'
import { Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps'
import { supabase } from './lib/supabase'
import { compressImage } from './lib/compress'

const VENDOR_TYPES = [
  { value: 'pushcart', label: 'Pushcart' },
  { value: 'street_stall', label: 'Street stall' },
  { value: 'small_shop', label: 'Small shop' },
  { value: 'restaurant', label: 'Restaurant' },
]

const CUISINE_TAGS = [
  'Chaat', 'Momos', 'South Indian', 'Biryani', 'Chinese',
  'Tea/Coffee', 'Sweets', 'Rolls/Wraps', 'North Indian', 'Dosa', 'Juice/Shakes',
]

const HOURS_OPTIONS = ['Morning', 'Lunch', 'Evening', 'Late night', 'All day']

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Must be a child of APIProvider (provided by page.tsx) to use useMapsLibrary
function MapStep({
  position,
  onPositionChange,
  address,
  onAddressChange,
}: {
  position: { lat: number; lng: number }
  onPositionChange: (pos: { lat: number; lng: number }) => void
  address: string
  onAddressChange: (address: string) => void
}) {
  const geocodingLib = useMapsLibrary('geocoding')

  // Reverse geocode on first load once the library is ready
  useEffect(() => {
    if (geocodingLib) reverseGeocode(position.lat, position.lng)
  }, [geocodingLib]) // eslint-disable-line react-hooks/exhaustive-deps

  async function reverseGeocode(lat: number, lng: number) {
    if (!geocodingLib) return
    try {
      const geocoder = new geocodingLib.Geocoder()
      const result = await geocoder.geocode({ location: { lat, lng } })
      if (result.results[0]) onAddressChange(result.results[0].formatted_address)
    } catch { /* silently ignore geocoding errors */ }
  }

  function handleDragEnd(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    onPositionChange({ lat, lng })
    reverseGeocode(lat, lng)
  }

  return (
    <Map
      defaultCenter={position}
      defaultZoom={17}
      mapId="foodmad-add-vendor"
      style={{ width: '100%', height: '100%' }}
      disableDefaultUI
    >
      <AdvancedMarker position={position} draggable onDragEnd={handleDragEnd}>
        <Pin background="#F59E0B" borderColor="#D97706" glyphColor="#fff" />
      </AdvancedMarker>
    </Map>
  )
}

export default function AddVendor({
  vendors,
  userLocation,
  onClose,
  onVendorAdded,
  userId,
}: {
  vendors: any[]
  userLocation: { lat: number; lng: number }
  onClose: () => void
  onVendorAdded: (vendor: any) => void
  userId?: string
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [pinPosition, setPinPosition] = useState(userLocation)
  const [address, setAddress] = useState('')
  const [nearbyVendor, setNearbyVendor] = useState<any | null>(null)

  const [name, setName] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [cuisineTags, setCuisineTags] = useState<string[]>([])
  const [hours, setHours] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleList<T>(value: T, list: T[], setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter(x => x !== value) : [...list, value])
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirmLocation() {
    const nearby = vendors.find(
      v => v.lat && v.lng && haversineDistance(pinPosition.lat, pinPosition.lng, v.lat, v.lng) <= 50
    )
    if (nearby) setNearbyVendor(nearby)
    else setStep(2)
  }

  async function handleSave() {
    if (!name || !vendorType) return
    setSaving(true)

    let photoUrl: string | null = null
    if (photoFile) {
      try {
        const compressed = await compressImage(photoFile)
        const fileName = `vendor_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      } catch {
        setSaving(false)
        alert('Photo upload failed. Try again or remove the photo.')
        return
      }
    }

    const { data: newVendor, error } = await supabase
      .from('vendors')
      .insert({
        name,
        type: vendorType,
        cuisine_tags: cuisineTags.length ? cuisineTags : null,
        hours: hours.length ? hours.join(', ') : null,
        lat: pinPosition.lat,
        lng: pinPosition.lng,
        photo_url: photoUrl,
        source: 'manual',
        added_by: userId ?? null,
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      console.error('Error saving vendor:', JSON.stringify(error))
      alert('Error saving vendor. Check console.')
      return
    }

    onVendorAdded(newVendor)
  }

  const chipStyle = (active: boolean) => ({
    padding: '8px 14px',
    borderRadius: 20,
    fontSize: 13,
    cursor: 'pointer' as const,
    border: active ? '1px solid #F59E0B' : '1px solid #333',
    background: active ? '#F59E0B22' : '#1a1a1a',
    color: active ? '#F59E0B' : '#9CA3AF',
  })

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#111',
      color: 'white',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #222',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step === 2 && (
            <button
              onClick={() => { setStep(1); setNearbyVendor(null) }}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0 }}
            >
              ←
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {step === 1 ? 'Drop a pin' : 'Vendor details'}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 24, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Step 1: Map */}
      {step === 1 && (
        <>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MapStep
              position={pinPosition}
              onPositionChange={setPinPosition}
              address={address}
              onAddressChange={setAddress}
            />
          </div>

          {/* Duplicate warning */}
          {nearbyVendor ? (
            <div style={{ padding: '16px 20px 28px', background: '#1a1a1a', borderTop: '1px solid #333', flexShrink: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
                Possible duplicate nearby
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 15, color: '#E5E7EB' }}>
                Is this the same as <strong>{nearbyVendor.name}</strong>?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: '1px solid #F59E0B', background: 'transparent',
                    color: '#F59E0B', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Yes, same place
                </button>
                <button
                  onClick={() => { setNearbyVendor(null); setStep(2) }}
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: '1px solid #333', background: '#333',
                    color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  No, different
                </button>
              </div>
            </div>
          ) : (
            /* Address + confirm button */
            <div style={{ padding: '12px 20px 28px', background: '#1a1a1a', borderTop: '1px solid #222', flexShrink: 0 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF' }}>
                {address || 'Drag the pin to the exact location'}
              </p>
              <button
                onClick={handleConfirmLocation}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  border: 'none', background: '#F59E0B',
                  color: 'black', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Confirm location →
              </button>
            </div>
          )}
        </>
      )}

      {/* Step 2: Form */}
      {step === 2 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>

          {/* Vendor name */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Vendor name *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sharma Ji Chaat"
            style={{
              width: '100%', padding: 12, background: '#1a1a1a',
              border: '1px solid #333', borderRadius: 8,
              color: 'white', fontSize: 16, marginBottom: 20, boxSizing: 'border-box',
            }}
          />

          {/* Type */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Type *</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {VENDOR_TYPES.map(t => (
              <button key={t.value} onClick={() => setVendorType(t.value)} style={chipStyle(vendorType === t.value)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Cuisine */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Cuisine</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {CUISINE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleList(tag, cuisineTags, setCuisineTags)}
                style={chipStyle(cuisineTags.includes(tag))}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Hours */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Usually open</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {HOURS_OPTIONS.map(h => (
              <button
                key={h}
                onClick={() => toggleList(h, hours, setHours)}
                style={chipStyle(hours.includes(h))}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Photo */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Photo (optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          {!photoPreview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: 14, borderRadius: 10,
                border: '1px dashed #333', background: '#1a1a1a',
                color: '#9CA3AF', fontSize: 14, cursor: 'pointer', marginBottom: 28,
              }}
            >
              📷 Add photo
            </button>
          ) : (
            <div style={{ position: 'relative', marginBottom: 28 }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }}
              />
              <button
                onClick={removePhoto}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
                  borderRadius: '50%', width: 28, height: 28, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!name || !vendorType || saving}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: name && vendorType ? '#F59E0B' : '#333',
              color: name && vendorType ? 'black' : '#666',
              fontSize: 16, fontWeight: 700,
              cursor: name && vendorType ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving...' : 'Add vendor'}
          </button>
        </div>
      )}
    </div>
  )
}
