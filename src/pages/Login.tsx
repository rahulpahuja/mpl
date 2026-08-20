import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { signInTestUser, signInWithGoogle } from '../lib/auth'
import { usingEmulators } from '../lib/firebase'

// Fixed set of emulator-only test accounts, one per role, so a multi-tab
// session can switch identities with a single click instead of retyping
// name/email in every tab. Matches the invites already seeded for testing.
const QUICK_LOGINS = [
  { label: 'Admin', name: 'Admin', email: 'admin@mpltest.com' },
  { label: 'Auction Manager', name: 'AuctionMgr', email: 'auctionmgr@mpltest.com' },
  { label: 'Captain 1', name: 'TM1', email: 'tm1@mpltest.com' },
  { label: 'Captain 2', name: 'TM2', email: 'tm2@mpltest.com' },
  { label: 'Captain 3', name: 'TM3', email: 'tm3@mpltest.com' },
  { label: 'Captain 4', name: 'TM4', email: 'tm4@mpltest.com' },
  { label: 'Captain 5', name: 'TM5', email: 'tm5@mpltest.com' },
  { label: 'Viewer 1', name: 'Viewer1', email: 'viewer1@mpltest.com' },
  { label: 'Viewer 2', name: 'Viewer2', email: 'viewer2@mpltest.com' },
  { label: 'Viewer 3', name: 'Viewer3', email: 'viewer3@mpltest.com' },
]

export function Login() {
  usePageTitle('Sign in')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testName, setTestName] = useState('')
  const [quickLoadingEmail, setQuickLoadingEmail] = useState<string | null>(null)

  async function handleQuickSignIn(name: string, email: string) {
    setQuickLoadingEmail(email)
    setError(null)
    try {
      await signInTestUser(email, name)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test sign-in failed')
    } finally {
      setQuickLoadingEmail(null)
    }
  }

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleTestSignIn() {
    if (!testEmail.trim() || !testName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await signInTestUser(testEmail.trim(), testName.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="relative z-[3] text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in</h1>
        <p className="relative z-[3] mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sign in with Google to get an account. An Admin then assigns you as a Captain or
          Auction Manager — you don't need an account at all just to watch as a Viewer.
        </p>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="input-glass relative z-[3] mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/90 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800/80"
        >
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        {error && <p className="relative z-[3] mt-3 text-sm text-red-600">{error}</p>}
        <div className="relative z-[3] mt-6 border-t border-gray-200/70 dark:border-gray-800/70 pt-4 text-center">
          <a href="/join" className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline">
            Join an auction as a viewer instead
          </a>
        </div>

        {usingEmulators && (
          <div className="relative z-[3] mt-6 rounded-lg border border-dashed border-amber-400/80 dark:border-amber-600/70 bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-sm p-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Quick test sign-in (one click per role)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {QUICK_LOGINS.map((q) => (
                <button
                  key={q.email}
                  onClick={() => handleQuickSignIn(q.name, q.email)}
                  disabled={quickLoadingEmail !== null}
                  className="rounded-lg border border-amber-300/80 dark:border-amber-700/70 bg-white/60 dark:bg-gray-800/60 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50/80 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-gray-700/60"
                >
                  {quickLoadingEmail === q.email ? 'Signing in...' : q.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs font-medium text-amber-700 dark:text-amber-400">
              Or sign in as a custom test user
            </p>
            <div className="mt-2 space-y-2">
              <input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Display name"
                className="input-glass w-full rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                type="email"
                className="input-glass w-full rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleTestSignIn}
                disabled={loading || !testEmail.trim() || !testName.trim()}
                className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Sign in as test user
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
