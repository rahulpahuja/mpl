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
    <nav className="edge-fade-x flex w-full gap-1 overflow-x-auto rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-gray-900/40 p-1 backdrop-blur-md">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? 'tab-brand'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
