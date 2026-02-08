'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAccessibleEntities, setEntitySelectionDone } from '@/app/actions/entity'
import { Building2, Loader2 } from 'lucide-react'

export default function ChooseEntityPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status !== 'authenticated') return

    getAccessibleEntities().then((list) => {
      setEntities(list)
      const currentId = (session?.user as any)?.entityId
      setSelectedId(currentId || (list[0]?.id ?? null))
      setLoading(false)
    })
  }, [status, session?.user, router])

  const handleContinue = async () => {
    if (!selectedId || submitting) return

    setSubmitting(true)
    try {
      const selected = entities.find((e) => e.id === selectedId)
      if (selected && selected.id !== (session?.user as any)?.entityId) {
        const updatePromise = update({
          entityId: selected.id,
          entityName: selected.name,
        })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        )
        await Promise.race([updatePromise, timeoutPromise])
      }
      router.push('/dashboard')
      router.refresh()
      setEntitySelectionDone().catch(() => {})
    } catch (err) {
      setSubmitting(false)
      if (err instanceof Error && err.message === 'timeout') {
        router.push('/dashboard')
        router.refresh()
      }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No entity access</CardTitle>
            <CardDescription>You do not have access to any entity. Please contact your administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-gray-600" />
          </div>
          <CardTitle>Choose entity</CardTitle>
          <CardDescription>
            You have access to more than one entity. Select which one you want to work with for this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Entity</label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continuing...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
