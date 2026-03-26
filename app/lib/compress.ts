// Compresses an image File to under maxBytes using canvas, returns a Blob
export async function compressImage(file: File, maxBytes = 1_000_000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const maxDim = 1200
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim }
        else { width = Math.round((width * maxDim) / height); height = maxDim }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      let quality = 0.8
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return }
          if (blob.size <= maxBytes || quality <= 0.2) { resolve(blob); return }
          quality -= 0.1
          tryCompress()
        }, 'image/jpeg', quality)
      }
      tryCompress()
    }
    img.onerror = reject
    img.src = url
  })
}
