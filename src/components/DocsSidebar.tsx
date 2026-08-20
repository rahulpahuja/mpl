import { NavLink } from 'react-router-dom'
import type { HelpSection } from '../content/helpContent'

// Presentation-only: given the full list of sections, render navigation to
// each one. Knows nothing about routing beyond the paths it's handed, so the
// same sidebar works regardless of how the parent page wires up its routes.
export function DocsSidebar({ sections }: { sections: HelpSection[] }) {
  return (
    <nav className="glass-card space-y-1 p-2">
      {sections.map((s) => (
        <NavLink
          key={s.id}
          to={`/docs/${s.id}`}
          className={({ isActive }) =>
            `relative z-[3] block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'tab-brand'
                : ''
            }`
          }
        >
          {s.label}
        </NavLink>
      ))}
    </nav>
  )
}
