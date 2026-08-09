import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { NAV_DESTINATIONS } from '../lib/navShortcuts'

// Only shows tabs the signed-in role can actually reach — an Auction Manager
// landing on a shared page like Teams shouldn't see nav links to pages
// they'll immediately get redirected away from.
export function AdminNav() {
  const user = useAuthStore((s) => s.user)
  const visibleTabs = NAV_DESTINATIONS.filter(
    (tab) => tab.section === 'admin' && user && (!tab.roles || tab.roles.includes(user.role)),
  )

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              isActive
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
