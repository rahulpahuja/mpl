import { NavLink } from 'react-router-dom'
import type { HelpSection } from '../content/helpContent'

// Presentation-only: given the full list of sections, render navigation to
// each one. Knows nothing about routing beyond the paths it's handed, so the
// same sidebar works regardless of how the parent page wires up its routes.
export function DocsSidebar({ sections }: { sections: HelpSection[] }) {
  return (
    <nav className="space-y-1">
      {sections.map((s) => (
        <NavLink
          key={s.id}
          to={`/docs/${s.id}`}
          className={({ isActive }) =>
            `block rounded-lg px-3 py-2 text-sm font-medium ${
              isActive
                ? 'bg-red-600 text-white'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`
          }
        >
          {s.label}
        </NavLink>
      ))}
    </nav>
  )
}
