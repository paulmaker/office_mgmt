import { Sidebar } from '@/components/sidebar'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Module access is enforced by:
  // 1. Server actions (requireModule checks) - primary enforcement
  // 2. Sidebar filtering (UI level) - prevents navigation to disabled modules
  // No need to check here - keeps bundle size down

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
