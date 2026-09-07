import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePageTitle } from '../hooks/usePageTitle'
import { Layout } from '../components/Layout'

type Sport = { id: string; name: string; icon: string; to?: string }

// Only Cricket is wired up today — every other sport renders as "Coming soon"
// until it has its own flow. Give a sport a `to` to turn its card live.
const SPORTS: Sport[] = [
  { id: 'cricket', name: 'Cricket', icon: '🏏', to: '/home' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'hockey', name: 'Hockey', icon: '🏑' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'badminton', name: 'Badminton', icon: '🏸' },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'kabaddi', name: 'Kabaddi', icon: '🤼' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'tableTennis', name: 'Table Tennis', icon: '🏓' },
]

export function Sports() {
  usePageTitle('Choose a sport')
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Choose a sport</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pick the sport you want to run an auction for. More sports are on the way.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SPORTS.map((sport) => {
            const inner = (
              <>
                <span className="relative z-[3] text-4xl" aria-hidden="true">
                  {sport.icon}
                </span>
                <span className="relative z-[3] font-medium text-gray-900 dark:text-gray-100">
                  {sport.name}
                </span>
                {!sport.to && (
                  <span className="relative z-[3] rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Coming soon
                  </span>
                )}
              </>
            )
            return (
              <li key={sport.id}>
                {sport.to ? (
                  <Link
                    to={sport.to}
                    className="glass-card glass-card-hoverable flex h-full flex-col items-center justify-center gap-2 px-4 py-6 text-center"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className="glass-card flex h-full cursor-not-allowed flex-col items-center justify-center gap-2 px-4 py-6 text-center opacity-70 grayscale"
                  >
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Layout>
  )
}
