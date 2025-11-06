'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockQuickLinks } from '@/lib/mock-data'
import { Plus, ExternalLink, Edit, Trash2, Link2 } from 'lucide-react'

export default function QuickLinksPage() {
  const categories = Array.from(new Set(mockQuickLinks.map(link => link.category)))

  const linksByCategory = categories.map(category => ({
    category,
    links: mockQuickLinks.filter(link => link.category === category),
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockQuickLinks.map((link) => (
          <Card key={link.id} className="hover:shadow-md transition-shadow">
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
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
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
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{link.name}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
