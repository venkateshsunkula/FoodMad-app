'use client'

import { useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { compressImage } from './lib/compress'

const TAGS = [
  { label: 'Spicy', icon: '🌶️' },
  { label: 'Tangy', icon: '🍋' },
  { label: 'Crispy', icon: '🥨' },
  { label: 'Sweet', icon: '🍬' },
  { label: 'Veg', icon: '🌿' },
  { label: 'Must-try', icon: '⭐' },
  { label: 'Late night', icon: '🌙' },
  { label: 'Comfort food', icon: '🫶' },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Skip it',
  2: 'It was ok',
  3: 'Pretty good',
  4: 'Really good',
  5: 'God-tier 🤤',
}

const DISH_SUGGESTIONS = ['Pani Puri', 'Momos', 'Chai', 'Biryani', 'Dosa', 'Vada Pav', 'Chaat', 'Rolls']

export default function LogMeal({
  vendors,
  onClose,
  preSelectedVendor,
  userId,
}: {
  vendors: any[]
  onClose: () => void
  preSelectedVendor?: any
  userId?: string
}) {
  const [selectedVendor, setSelectedVendor] = useState<any | null>(preSelectedVendor ?? null)
  const [dishName, setDishName] = useState('')
  const [rating, setRating] = useState(3)
  const [price, setPrice] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(preSelectedVendor ? 2 : 1)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!selectedVendor || !dishName || rating === 0) return
    setSaving(true)

    const now = new Date()
    const hour = now.getHours()
    let timeOfDay = 'morning'
    if (hour >= 11 && hour < 15) timeOfDay = 'lunch'
    else if (hour >= 15 && hour < 21) timeOfDay = 'evening'
    else if (hour >= 21) timeOfDay = 'late'

    let photoUrl: string | null = null
    if (photoFile) {
      try {
        const compressed = await compressImage(photoFile)
        const fileName = `meal_${Date.now()}.jpg`
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

    const { error } = await supabase.from('meal_logs').insert({
      vendor_id: selectedVendor.id,
      user_id: userId ?? null,
      dish_name: dishName,
      rating,
      price_inr: price ? parseInt(price) : null,
      tags: selectedTags,
      note: note || null,
      photo_url: photoUrl,
      time_of_day: timeOfDay,
      logged_at: new Date().toISOString(),
      lat: selectedVendor.lat,
      lng: selectedVendor.lng,
    })

    setSaving(false)
    if (error) {
      alert('Error saving. Check console.')
    } else {
      onClose()
    }
  }

  // ── Step 1: Pick vendor ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0a', color: 'white',
        zIndex: 1000, overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer' }}>✕</button>
          <span style={{ fontWeight: 700, fontSize: 17 }}>New Entry</span>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: '20px 20px 100px' }}>
          <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>Where did you eat?</p>
          {vendors.filter(v => v.lat && v.lng).map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => { setSelectedVendor(vendor); setStep(2) }}
              style={{
                background: '#1a1a1a',
                border: '1px solid #252525',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: vendor.source === 'manual' ? '#F59E0B22' : '#1f1f1f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {vendor.source === 'manual' ? '📍' : '🍽️'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'white' }}>{vendor.name}</p>
                <p style={{ margin: '3px 0 0', color: '#6B7280', fontSize: 12 }}>
                  {vendor.type?.replace('_', ' ')} · {vendor.neighborhood || vendor.city}
                </p>
              </div>
              <span style={{ color: '#333', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 2: Log meal ─────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a', color: 'white',
      zIndex: 1000, overflowY: 'auto',
    }}>
      {/* Header */}
      <nav style={{
        position: 'sticky', top: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px',
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1a1a1a',
        zIndex: 10,
      }}>
        <button
          onClick={() => { setSelectedVendor(null); setStep(1) }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#1a1a1a', border: '1px solid #252525',
            color: '#9CA3AF', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 17, fontStyle: 'italic' }}>New Entry</span>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#1a1a1a', border: '1px solid #252525',
            color: '#9CA3AF', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </nav>

      <div style={{ paddingBottom: 120 }}>

        {/* Hero photo section */}
        <section style={{ padding: '16px 16px 0' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => !photoPreview && fileInputRef.current?.click()}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: 20,
              overflow: 'hidden',
              background: '#1a1a1a',
              cursor: photoPreview ? 'default' : 'pointer',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Food" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Captured</p>
                    <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: 'white', fontStyle: 'italic' }}>
                      {dishName || 'Your meal'}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removePhoto() }}
                    style={{
                      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '50%', width: 40, height: 40,
                      color: 'white', fontSize: 16, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#252525', border: '1px solid #333',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>📷</div>
                <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Tap to add photo</p>
                <p style={{ margin: 0, fontSize: 11, color: '#444' }}>optional</p>
              </div>
            )}
          </div>

          {/* Selected vendor chip */}
          <div style={{
            marginTop: 12,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#F59E0B22', border: '1px solid #F59E0B44',
            borderRadius: 20, padding: '6px 12px',
          }}>
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>{selectedVendor?.name}</span>
          </div>
        </section>

        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Dish name */}
          <div>
            <label style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
              What are you eating?
            </label>
            <input
              type="text"
              value={dishName}
              onChange={e => setDishName(e.target.value)}
              placeholder="Dish name..."
              style={{
                width: '100%', padding: '16px 18px',
                background: '#1a1a1a', border: '1px solid #252525',
                borderRadius: 14, color: 'white',
                fontSize: 22, fontWeight: 700, fontStyle: 'italic',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {/* Suggestions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {DISH_SUGGESTIONS.filter(s => !dishName || s.toLowerCase().includes(dishName.toLowerCase())).slice(0, 5).map(s => (
                <button
                  key={s}
                  onClick={() => setDishName(s)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12,
                    background: '#1a1a1a', border: '1px solid #2a2a2a',
                    color: '#9CA3AF', cursor: 'pointer',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Rating slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                The Flavor Verdict
              </label>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>{RATING_LABELS[rating]}</span>
            </div>
            <div style={{
              background: '#1a1a1a', border: '1px solid #252525',
              borderRadius: 16, padding: '20px 20px 28px',
              position: 'relative',
            }}>
              <input
                type="range"
                min={1} max={5} step={1}
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                style={{
                  width: '100%', height: 4,
                  appearance: 'none', background: `linear-gradient(to right, #F59E0B ${(rating - 1) * 25}%, #333 ${(rating - 1) * 25}%)`,
                  borderRadius: 4, outline: 'none', cursor: 'pointer',
                  accentColor: '#F59E0B',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                {['Skip it', 'Ok', 'Good', 'Really good', '🤤'].map((l, i) => (
                  <span key={i} style={{ fontSize: 10, color: rating === i + 1 ? '#F59E0B' : '#444', fontWeight: rating === i + 1 ? 700 : 400 }}>{l}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Price + Vendor bento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Price</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 18 }}>₹</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1, background: 'none', border: 'none', color: 'white',
                    fontSize: 22, fontWeight: 700, outline: 'none', padding: 0,
                    width: '100%',
                  }}
                />
              </div>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 14, padding: 16 }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Vendor</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedVendor?.name}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>
                {selectedVendor?.type?.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Tasting notes */}
          <div>
            <label style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
              Tasting Notes
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {TAGS.map(tag => {
                const active = selectedTags.includes(tag.label)
                return (
                  <button
                    key={tag.label}
                    onClick={() => toggleTag(tag.label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 100,
                      border: active ? '1px solid #F59E0B' : '1px solid #252525',
                      background: active ? '#F59E0B22' : '#1a1a1a',
                      color: active ? '#F59E0B' : '#9CA3AF',
                      fontSize: 13, cursor: 'pointer',
                      transform: active ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any thoughts about the meal..."
              rows={2}
              style={{
                width: '100%', padding: '14px 16px',
                background: '#1a1a1a', border: '1px solid #252525',
                borderRadius: 14, color: 'white', fontSize: 14,
                resize: 'none', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

        </div>
      </div>

      {/* Fixed save button */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)',
        padding: '16px 16px 32px',
        borderTop: '1px solid #1a1a1a',
      }}>
        <button
          onClick={handleSave}
          disabled={!dishName || rating === 0 || saving}
          style={{
            width: '100%', padding: '18px 0',
            borderRadius: 16, border: 'none',
            background: dishName && rating > 0 ? '#F59E0B' : '#1a1a1a',
            color: dishName && rating > 0 ? '#000' : '#444',
            fontSize: 17, fontWeight: 800,
            cursor: dishName && rating > 0 ? 'pointer' : 'default',
            letterSpacing: '0.02em',
            boxShadow: dishName && rating > 0 ? '0 4px 0 #D97706, 0 8px 20px rgba(245,158,11,0.25)' : 'none',
            transform: 'translateY(0)',
            transition: 'all 0.15s',
          }}
        >
          {saving ? (photoFile ? 'Uploading...' : 'Saving...') : 'Save & Log Entry →'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <div style={{ width: 36, height: 4, background: '#1a1a1a', borderRadius: 2 }} />
        </div>
      </footer>
    </div>
  )
}
