import { Sidebar } from '@/components/sidebar'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAccessibleEntities } from '@/app/actions/entity'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const entities = await getAccessibleEntities()
  const hasMultipleEntities = entities.length > 1

  if (hasMultipleEntities) {
    const cookieStore = await cookies()
    const hasChosenEntity = cookieStore.get('entity_selection_done')
    if (!hasChosenEntity) {
      redirect('/auth/choose-entity')
    }
  }

  // Module access is enforced by:
  // 1. Server actions (requireModule checks) - primary enforcement
  // 2. Sidebar filtering (UI level) - prevents navigation to disabled modules
  // No need to check here - keeps bundle size down

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar hasMultipleEntities={hasMultipleEntities} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
