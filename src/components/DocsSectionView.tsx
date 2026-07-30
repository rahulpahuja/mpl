import type { HelpSection } from '../content/helpContent'

// Presentation-only: renders one section's content blocks. Has no idea what
// page it's embedded in or how the active section was chosen.
export function DocsSectionView({ section }: { section: HelpSection }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{section.label}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{section.summary}</p>
      </div>
      {section.body.map((block) => (
        <div key={block.heading}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {block.heading}
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
            {block.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
