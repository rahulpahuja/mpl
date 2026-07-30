import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Auctions', end: true },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/players', label: 'Players' },
]

export function AdminNav() {
  return (
    <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
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
