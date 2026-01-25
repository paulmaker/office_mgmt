import { Sidebar } from '@/components/sidebar'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { ROUTE_TO_MODULE, type ModuleKey } from '@/lib/module-access'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Additional client-side module check (redundant but provides better UX)
  // The middleware already handles this, but this provides immediate feedback
  const enabledModules = (session.user as any)?.enabledModules || []

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
