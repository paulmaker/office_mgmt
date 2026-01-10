'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockClients } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Edit, Mail, Phone, MapPin } from 'lucide-react'

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-gray-500 mt-1">
            Manage your client database and view account details
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.companyName || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.address ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {client.vatRegistered && (
                        <Badge variant="secondary" className="text-xs">VAT</Badge>
                      )}
                      {client.cisRegistered && (
                        <Badge variant="secondary" className="text-xs">CIS</Badge>
                      )}
                      {!client.vatRegistered && !client.cisRegistered && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.paymentTerms} days</TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No clients found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clients</CardDescription>
            <CardTitle className="text-3xl">{mockClients.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Active client accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VAT Registered</CardDescription>
            <CardTitle className="text-3xl">
              {mockClients.filter(c => c.vatRegistered).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Clients registered for VAT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CIS Registered</CardDescription>
            <CardTitle className="text-3xl">
              {mockClients.filter(c => c.cisRegistered).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">CIS scheme contractors</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
