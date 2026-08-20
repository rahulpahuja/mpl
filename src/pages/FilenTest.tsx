import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { FilenUpload } from '../components/FilenUpload'
import { FilenFileList } from '../components/FilenFileList'
import { usePageTitle } from '../hooks/usePageTitle'

type ServiceState = 'checking' | 'up' | 'down'

function Dot({ state }: { state: ServiceState }) {
  const color =
    state === 'up' ? 'bg-green-500' : state === 'down' ? 'bg-red-500' : 'bg-gray-400 animate-pulse'
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

// Pings the proxy's /health (unauthenticated, cheap) to distinguish "Render
// service unreachable" from "Render is up but Filen login/connectivity is
// broken" — the two failure modes look identical from the UI otherwise.
// Render's free tier spins down after ~15min idle, so the first check after
// a quiet period can take up to ~50s to resolve as the container cold-starts.
function ServiceStatus() {
  const [render, setRender] = useState<ServiceState>('checking')
  const [filen, setFilen] = useState<ServiceState>('checking')
  const [checking, setChecking] = useState(false)

  async function check() {
    const proxyUrl = import.meta.env.VITE_FILEN_PROXY_URL as string | undefined
    if (!proxyUrl) {
      setRender('down')
      setFilen('down')
      return
    }
    setChecking(true)
    setRender('checking')
    setFilen('checking')
    try {
      const res = await fetch(`${proxyUrl}/health`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { server?: string; filen?: string }
      setRender(data.server === 'up' ? 'up' : 'down')
      setFilen(data.filen === 'up' ? 'up' : 'down')
    } catch {
      setRender('down')
      setFilen('down')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    check()
  }, [])

  return (
    <div className="rounded-lg bg-white/40 dark:bg-white/5 p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-gray-700 dark:text-gray-300">Service status</h2>
        <button
          onClick={check}
          disabled={checking}
          className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
        >
          {checking ? 'Checking...' : 'Recheck'}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        First check after ~15min of no traffic can take up to 50s — Render's free tier spins the
        server down when idle.
      </p>
      <div className="mt-3 flex gap-6">
        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Dot state={render} /> Render service: {render}
        </span>
        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Dot state={filen} /> Filen: {filen}
        </span>
      </div>
    </div>
  )
}

// Admin-only sanity check for the Filen storage proxy (server/) — store a
// file, list it back, view/download it, delete it. Not part of any real
// feature; exists to verify the pipeline end-to-end before wiring Filen into
// an actual part of the app.
export function FilenTest() {
  usePageTitle('Filen test')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <Layout>
      <div className="glass-card relative z-[3] mx-auto max-w-xl space-y-6 p-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filen storage test</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Uploads go through the proxy at{' '}
            <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-xs">
              {import.meta.env.VITE_FILEN_PROXY_URL || '(VITE_FILEN_PROXY_URL not set)'}
            </code>{' '}
            and are stored on Filen. Nothing here is wired into any real feature yet.
          </p>
        </div>

        <ServiceStatus />

        <FilenUpload onUploaded={() => setRefreshKey((k) => k + 1)} />

        <div>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Files</h2>
          <div className="mt-2">
            <FilenFileList refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
