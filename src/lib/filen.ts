import { auth } from './firebase'

// Base URL of the small always-on proxy in server/ — see server/README.md
// for why a backend is needed at all (Filen is E2E-encrypted, so there's no
// presigned/temporary URL the browser could hit directly).
const PROXY_URL = import.meta.env.VITE_FILEN_PROXY_URL as string | undefined

export interface FilenFile {
  id: string
  name: string
  size: number
  lastModified: number | null
}

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

function requireProxyUrl(): string {
  if (!PROXY_URL) throw new Error('VITE_FILEN_PROXY_URL is not configured')
  return PROXY_URL
}

export async function listFilenFiles(): Promise<FilenFile[]> {
  const res = await fetch(`${requireProxyUrl()}/files`, { headers: await authHeader() })
  if (!res.ok) throw new Error(`Failed to list files (${res.status})`)
  return res.json()
}

// Uses XHR rather than fetch so upload progress events are available —
// fetch's streaming request body support doesn't expose upload progress in
// every browser Filen users are likely on.
export function uploadToFilen(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<FilenFile> {
  return authHeader().then(
    (headers) =>
      new Promise<FilenFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${requireProxyUrl()}/upload`)
        for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed — network error'))
        const formData = new FormData()
        formData.append('file', file)
        xhr.send(formData)
      }),
  )
}

// Fetches the file as a Blob rather than returning a bare URL, since every
// download needs the Authorization header attached — a plain <img src> or
// <a href> can't carry that. Callers turn the Blob into an object URL (see
// FilenFileList.tsx) and must revokeObjectURL it when done to avoid leaking
// memory.
export async function downloadFilenFile(id: string): Promise<Blob> {
  const res = await fetch(`${requireProxyUrl()}/download/${encodeURIComponent(id)}`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  return res.blob()
}

export async function deleteFilenFile(id: string): Promise<void> {
  const res = await fetch(`${requireProxyUrl()}/files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeader(),
  })
  if (!res.ok && res.status !== 404) throw new Error(`Delete failed (${res.status})`)
}
