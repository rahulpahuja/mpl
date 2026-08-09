import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'mpl-chunk-reload'

// Dynamic imports for lazy-loaded routes reference hashed chunk filenames
// baked into the index.html a browser tab loaded with. Every push redeploys
// and drops the old chunks, so a tab left open across a deploy gets a 404
// (Netlify's SPA fallback serves index.html for it, which the browser then
// rejects as a bad module MIME type) the next time it navigates to a route
// it hasn't loaded yet. A full reload fetches the current index.html and
// fixes it — the sessionStorage flag stops a genuinely broken chunk from
// reload-looping forever.
export function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(RELOAD_FLAG)
      return mod
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Reload is in flight — never resolve so React keeps showing the
        // Suspense fallback instead of throwing this error into the tree.
        return new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
