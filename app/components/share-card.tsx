'use client'

import { useState } from 'react'

interface ShareCardProps {
  log: {
    dish_name: string
    rating: number
    photo_url?: string | null
    price_inr?: number | null
    tags?: string[]
    note?: string | null
    vendors?: { name: string } | any
  }
  userName: string
  onClose: () => void
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    // Fetch as blob to bypass canvas CORS restrictions
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img) }
      img.onerror = () => resolve(null)
      img.src = blobUrl
    })
  } catch {
    return null
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y
  for (const word of words) {
    const testLine = line + word + ' '
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY)
      line = word + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line.trim()) { ctx.fillText(line.trim(), x, currentY); currentY += lineHeight }
  return currentY
}

async function generateCard(log: ShareCardProps['log'], userName: string): Promise<Blob> {
  const W = 1080, H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // ── Background ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0f0f0f')
  bg.addColorStop(1, '#1a1200')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // ── Photo section ─────────────────────────────────────────────────
  let photoLoaded = false
  if (log.photo_url) {
    const img = await loadImage(log.photo_url)
    if (img) {
      photoLoaded = true
      const pH = 780, pX = 60, pY = 80, pW = W - 120, r = 36

      // Clip to rounded rect
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(pX + r, pY)
      ctx.lineTo(pX + pW - r, pY)
      ctx.quadraticCurveTo(pX + pW, pY, pX + pW, pY + r)
      ctx.lineTo(pX + pW, pY + pH - r)
      ctx.quadraticCurveTo(pX + pW, pY + pH, pX + pW - r, pY + pH)
      ctx.lineTo(pX + r, pY + pH)
      ctx.quadraticCurveTo(pX, pY + pH, pX, pY + pH - r)
      ctx.lineTo(pX, pY + r)
      ctx.quadraticCurveTo(pX, pY, pX + r, pY)
      ctx.closePath()
      ctx.clip()

      // Cover-fit image
      const scale = Math.max(pW / img.width, pH / img.height)
      const dw = img.width * scale, dh = img.height * scale
      ctx.drawImage(img, pX + (pW - dw) / 2, pY + (pH - dh) / 2, dw, dh)

      // Gradient overlay on photo
      const grad = ctx.createLinearGradient(0, pY + pH * 0.5, 0, pY + pH)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = grad
      ctx.fillRect(pX, pY, pW, pH)
      ctx.restore()
    }
  }

  // ── Text area ─────────────────────────────────────────────────────
  const textTop = photoLoaded ? 900 : 300

  // Dish name
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.font = 'bold italic 88px Georgia, serif'
  const nextY = wrapText(ctx, log.dish_name, W / 2, textTop, W - 120, 100)

  // Stars
  ctx.font = 'bold 60px Arial'
  ctx.fillStyle = '#F59E0B'
  ctx.fillText('★'.repeat(log.rating) + '☆'.repeat(5 - log.rating), W / 2, nextY + 20)

  // Vendor
  if (log.vendors?.name) {
    ctx.font = '40px Arial'
    ctx.fillStyle = 'rgba(245,158,11,0.85)'
    ctx.fillText(`@ ${log.vendors.name}`, W / 2, nextY + 100)
  }

  // Price
  if (log.price_inr) {
    ctx.font = '36px Arial'
    ctx.fillStyle = '#6B7280'
    ctx.fillText(`₹${log.price_inr}`, W / 2, nextY + 155)
  }

  // Tags as pills (draw as text)
  if (log.tags?.length) {
    ctx.font = '30px Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText(log.tags.slice(0, 4).join('  ·  '), W / 2, nextY + (log.price_inr ? 205 : 165))
  }

  // ── Branding bar ─────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(0, H - 100, W, 100)

  ctx.font = 'bold 34px Arial'
  ctx.fillStyle = '#F59E0B'
  ctx.textAlign = 'left'
  ctx.fillText('foodmad', 60, H - 42)

  ctx.font = '30px Arial'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.textAlign = 'right'
  ctx.fillText(`by ${userName}`, W - 60, H - 42)

  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.92))
}

export default function ShareCard({ log, userName, onClose }: ShareCardProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle')

  async function handleShare() {
    setStatus('generating')
    try {
      const blob = await generateCard(log, userName)
      const file = new File([blob], 'foodmad-meal.jpg', { type: 'image/jpeg' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: log.dish_name, text: `${log.dish_name} @ ${log.vendors?.name} — via Foodmad` })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'foodmad-meal.jpg'; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Could not share. Try downloading instead.')
    }
    setStatus('idle')
  }

  async function handleDownload() {
    setStatus('generating')
    try {
      const blob = await generateCard(log, userName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'foodmad-meal.jpg'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not generate image.')
    }
    setStatus('idle')
  }

  const vendorName = log.vendors?.name ?? ''

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', background: '#111', borderRadius: '20px 20px 0 0', padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)', boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Preview card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1200 100%)',
          borderRadius: 20, overflow: 'hidden', marginBottom: 20,
          border: '1px solid rgba(245,158,11,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {log.photo_url && (
            <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
              <img src={log.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
            </div>
          )}
          <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: 'white', lineHeight: 1.2 }}>{log.dish_name}</p>
            <p style={{ margin: '0 0 6px', fontSize: 20, color: '#F59E0B' }}>{'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}</p>
            {vendorName && <p style={{ margin: '0 0 4px', fontSize: 14, color: 'rgba(245,158,11,0.8)' }}>@ {vendorName}</p>}
            {log.price_inr && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6B7280' }}>₹{log.price_inr}</p>}
            {log.tags && log.tags.length > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{log.tags.slice(0, 4).join(' · ')}</p>
            )}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B' }}>foodmad</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>by {userName}</span>
          </div>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
          {status === 'generating' ? 'Generating image…' : 'Share this meal card'}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleDownload}
            disabled={status === 'generating'}
            style={{
              flex: 1, padding: '15px 0', borderRadius: 14,
              border: '1px solid #333', background: '#1a1a1a',
              color: status === 'generating' ? '#444' : '#9CA3AF',
              fontSize: 14, fontWeight: 700, cursor: status === 'generating' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {status === 'generating' ? (
              <span style={{ width: 16, height: 16, border: '2px solid #444', borderTopColor: '#666', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            Save
          </button>
          <button
            onClick={handleShare}
            disabled={status === 'generating'}
            style={{
              flex: 2, padding: '15px 0', borderRadius: 14,
              border: 'none', background: status === 'generating' ? '#D97706' : '#F59E0B',
              color: 'black', fontSize: 14, fontWeight: 800,
              cursor: status === 'generating' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
            }}
          >
            {status === 'generating' ? (
              <><span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: 'black', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</>
            )}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
