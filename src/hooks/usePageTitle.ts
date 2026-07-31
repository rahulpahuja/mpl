import { useEffect } from 'react'

const APP_NAME = 'MPL Auction Manager'

// Every page calls this with its own segment title so the browser tab,
// history entries, and screen readers announcing navigation all reflect
// which page you're actually on — instead of every route sharing one
// static <title> the whole session.
export function usePageTitle(segment: string | null | undefined) {
  useEffect(() => {
    document.title = segment ? `${segment} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = APP_NAME
    }
  }, [segment])
}
