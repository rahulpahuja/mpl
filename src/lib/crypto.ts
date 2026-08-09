// Client-side AES-GCM encryption for data stored on the user doc (currently:
// profile photos, see ProfilePhotoUpload). This is a single, app-wide key
// baked into the client bundle at build time — it stops a raw Firestore
// export/backup or console browse from showing a viewable image, but it is
// NOT a secret from anyone who can read the deployed JS (this app has no
// backend to hold a real server-side secret). Treat it as at-rest hygiene,
// not as protection against a determined attacker with the client bundle.
const KEY_MATERIAL = import.meta.env.VITE_PROFILE_IMAGE_KEY as string | undefined

let cachedKey: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (!KEY_MATERIAL) {
    throw new Error('VITE_PROFILE_IMAGE_KEY is not configured — photo upload is unavailable.')
  }
  if (!cachedKey) {
    cachedKey = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(KEY_MATERIAL))
      .then((bits) => crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']))
  }
  return cachedKey
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const IV_LENGTH_BYTES = 12

export async function encryptToBase64(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bytesToBase64(combined)
}

export async function decryptFromBase64(payload: string): Promise<string> {
  const key = await getKey()
  const combined = base64ToBytes(payload)
  const iv = combined.slice(0, IV_LENGTH_BYTES)
  const ciphertext = combined.slice(IV_LENGTH_BYTES)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
