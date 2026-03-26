'use client'

import { useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { compressImage } from './lib/compress'

const TAGS = ['spicy', 'veg', 'non-veg', 'sweet', 'must-try', 'comfort food', 'late night', 'seasonal']

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
  const [rating, setRating] = useState(0)
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

    // Upload photo if one was selected
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
      } catch (err) {
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
      console.error('Error saving meal log:', JSON.stringify(error))
      alert('Error saving. Check console.')
    } else {
      alert('Meal saved!')
      onClose()
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#111',
      color: 'white',
      zIndex: 1000,
      overflowY: 'auto',
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          {step === 1 ? 'Pick a vendor' : 'Log your meal'}
        </h2>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: '#9CA3AF',
          fontSize: 24,
          cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Step 1: Pick vendor */}
      {step === 1 && (
        <div>
          {vendors.filter(v => v.lat && v.lng).map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => { setSelectedVendor(vendor); setStep(2) }}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                cursor: 'pointer',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{vendor.name}</p>
              <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                {vendor.type?.replace('_', ' ')} • {vendor.neighborhood}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Meal details */}
      {step === 2 && (
        <div>
          {/* Selected vendor */}
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #F59E0B',
            borderRadius: 10,
            padding: 12,
            marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#F59E0B' }}>{selectedVendor?.name}</p>
          </div>

          {/* Dish name */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            What did you eat?
          </label>
          <input
            type="text"
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="e.g. Pani Puri, Momos, Chai..."
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 16,
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />

          {/* Rating */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Rating
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  border: 'none',
                  background: rating >= star ? '#F59E0B' : '#333',
                  color: rating >= star ? 'black' : '#9CA3AF',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {star}
              </button>
            ))}
          </div>

          {/* Price */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Price (₹)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 50"
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 16,
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />

          {/* Tags */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Tags
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: selectedTags.includes(tag) ? '1px solid #F59E0B' : '1px solid #333',
                  background: selectedTags.includes(tag) ? '#F59E0B22' : '#1a1a1a',
                  color: selectedTags.includes(tag) ? '#F59E0B' : '#9CA3AF',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Photo */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Photo (optional)
          </label>
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
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: '1px dashed #333',
                background: '#1a1a1a',
                color: '#9CA3AF',
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              📷 Add photo
            </button>
          ) : (
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }}
              />
              <button
                onClick={removePhoto}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Note */}
          <label style={{ fontSize: 14, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any thoughts about the meal..."
            rows={2}
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              marginBottom: 24,
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!dishName || rating === 0 || saving}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: 'none',
              background: dishName && rating > 0 ? '#F59E0B' : '#333',
              color: dishName && rating > 0 ? 'black' : '#666',
              fontSize: 16,
              fontWeight: 700,
              cursor: dishName && rating > 0 ? 'pointer' : 'default',
            }}
          >
            {saving ? (photoFile ? 'Uploading...' : 'Saving...') : 'Save meal'}
          </button>
        </div>
      )}
    </div>
  )
}