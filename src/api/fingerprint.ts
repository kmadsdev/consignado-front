// A device fingerprint made in the browser, with no third-party library.
// It is a SHA-256 hash of stable browser properties. Only the hash leaves the
// browser, and the gateway stores it again as a keyed hash (HMAC). Its one use:
// to find a second account made on the same device.
function canvasText(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240; canvas.height = 48
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-2d'
    ctx.textBaseline = 'top'
    ctx.font = '16px Arial, sans-serif'
    ctx.fillStyle = '#f60'
    ctx.fillRect(100, 4, 80, 24)
    ctx.fillStyle = '#069'
    ctx.fillText('Consignado Cloud 0123 ~', 4, 6)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Consignado Cloud 0123 ~', 6, 14)
    return canvas.toDataURL()
  } catch {
    return 'no-canvas'
  }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

let cached: Promise<string> | null = null

/** 64 hex characters. The same browser on the same device gives the same value. */
export function deviceFingerprint(): Promise<string> {
  if (!cached) {
    const n = navigator
    const parts = [
      n.userAgent,
      n.platform,
      (n.languages ?? [n.language]).join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}`,
      String(screen.colorDepth),
      String(n.hardwareConcurrency ?? ''),
      canvasText(),
    ]
    cached = sha256Hex(parts.join('|'))
  }
  return cached
}
