'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getQuickLinks, deleteQuickLink } from '@/app/actions/quick-links'
import { Plus, ExternalLink, Edit, Trash2, Link2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuickLinkForm } from '@/components/quick-links/quick-link-form'
import { useToast } from '@/hooks/use-toast'
import type { QuickLink } from '@prisma/client'

export default function QuickLinksPage() {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadLinks = async () => {
    try {
      setIsLoading(true)
      const data = await getQuickLinks()
      setQuickLinks(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load quick links',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, [])

  const handleCreate = () => {
    setEditingLink(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (link: QuickLink) => {
    setEditingLink(link)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingLinkId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingLinkId) return

    try {
      await deleteQuickLink(deletingLinkId)
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Quick link deleted successfully',
      })
      loadLinks()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete quick link',
      })
    } finally {
      setDeleteDialogOpen(false)
      setDeletingLinkId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingLink(null)
    toast({
      variant: 'success',
      title: 'Success',
      description: `Quick link ${editingLink ? 'updated' : 'created'} successfully`,
    })
    loadLinks()
  }

  const categories = Array.from(new Set(quickLinks.map(link => link.category))).sort()

  const linksByCategory = categories.map(category => ({
    category,
    links: quickLinks.filter(link => link.category === category),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Links</h1>
          <p className="text-gray-500 mt-1">
            Manage shortcuts to frequently used websites and services
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : quickLinks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No quick links yet</h3>
            <p className="text-gray-500 mb-4">Create your first quick link to get started.</p>
            <Button onClick={handleCreate}>Add Quick Link</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Access Grid (Top 6) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickLinks.slice(0, 6).map((link) => (
              <Card key={link.id} className="hover:shadow-md transition-shadow group relative">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Link2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{link.name}</h3>
                        <p className="text-sm text-gray-500">{link.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(link)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(link.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      Open Link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Grouped by Category */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Organized by Category</h2>
            {linksByCategory.map(({ category, links }) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                  <CardDescription>{links.length} link{links.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 group"
                      >
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{link.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(link)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete(link.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 ml-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLink ? 'Edit Quick Link' : 'Add Quick Link'}
            </DialogTitle>
          </DialogHeader>
          <QuickLinkForm
            quickLink={editingLink}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quick link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
