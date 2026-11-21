/**
 * Cloudinary Upload Helper Service
 * Uploads images and logos to Cloudinary CDN via the backend /api/upload endpoint
 */

export async function uploadImageToCloudinary(fileOrBase64, folder = 'kerala_wood_billing', filename = '') {
  let base64Data = fileOrBase64

  if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
    base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(fileOrBase64)
    })
    if (!filename && fileOrBase64.name) {
      filename = fileOrBase64.name
    }
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64Data,
      folder,
      filename,
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to upload image to Cloudinary')
  }

  return {
    url: data.url,
    public_id: data.public_id,
    format: data.format,
    width: data.width,
    height: data.height,
  }
}

export async function checkCloudinaryStatus() {
  try {
    const res = await fetch('/api/cloudinary/status')
    const data = await res.json()
    return data
  } catch {
    return { success: false, configured: false }
  }
}
