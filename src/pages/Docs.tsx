import { Navigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { DocsSidebar } from '../components/DocsSidebar'
import { DocsSectionView } from '../components/DocsSectionView'
import { helpSections, getHelpSection } from '../content/helpContent'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../store/authStore'

// Real, bookmarkable/shareable pages for "how to use this app" — one URL per
// role's guide — instead of a modal. Defaults to the signed-in user's own
// role so the most relevant guide is one click away from anywhere in the app.
export function Docs() {
  const { sectionId } = useParams<{ sectionId?: string }>()
  const user = useAuthStore((s) => s.user)
  const section = getHelpSection(sectionId)
  usePageTitle(section ? `Help · ${section.label}` : 'Help')

  if (!sectionId) {
    return <Navigate to={`/docs/${user?.role ?? 'overview'}`} replace />
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        <DocsSidebar sections={helpSections} />
        {section ? (
          <DocsSectionView section={section} />
        ) : (
          <p className="text-sm text-gray-500">
            No documentation found for "{sectionId}".
          </p>
        )}
      </div>
    </Layout>
  )
}
