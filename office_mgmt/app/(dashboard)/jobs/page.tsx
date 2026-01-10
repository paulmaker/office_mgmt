'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockJobs, mockClients, mockEmployees } from '@/lib/mock-data'
import { formatCurrency, formatDate, getJobStatusColor } from '@/lib/utils'
import { Plus, Search, Edit, MapPin, CheckCircle2, XCircle } from 'lucide-react'

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch =
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') return matchesSearch && job.status === 'PENDING'
    if (activeTab === 'in_progress') return matchesSearch && job.status === 'IN_PROGRESS'
    if (activeTab === 'complete') return matchesSearch && job.status === 'COMPLETE'

    return matchesSearch
  })

  const getClientName = (job: typeof mockJobs[0]) => {
    const client = mockClients.find(c => c.id === job.clientId)
    return client?.companyName || client?.name || 'Unknown'
  }

  const getClientAddress = (job: typeof mockJobs[0]) => {
    const client = mockClients.find(c => c.id === job.clientId)
    return client?.address || '-'
  }

  const getEmployeeName = (job: typeof mockJobs[0]) => {
    if (!job.employeeId) return '-'
    const employee = mockEmployees.find(e => e.id === job.employeeId)
    return employee?.name || 'Unknown'
  }

  const stats = {
    total: mockJobs.length,
    pending: mockJobs.filter(j => j.status === 'PENDING').length,
    inProgress: mockJobs.filter(j => j.status === 'IN_PROGRESS').length,
    complete: mockJobs.filter(j => j.status === 'COMPLETE').length,
    totalValue: mockJobs.reduce((sum, j) => sum + j.price, 0),
    unpaidValue: mockJobs.filter(j => !j.invoicePaid).reduce((sum, j) => sum + j.price, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Sheets</h1>
          <p className="text-gray-500 mt-1">
            Manage jobs and track work progress for clients
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.unpaidValue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex gap-4 border-b mb-4">
              <Tabs.Trigger
                key="tab-all"
                value="all"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                All Jobs
              </Tabs.Trigger>
              <Tabs.Trigger
                key="tab-pending"
                value="pending"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-600"
              >
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger
                key="tab-in-progress"
                value="in_progress"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                In Progress
              </Tabs.Trigger>
              <Tabs.Trigger
                key="tab-complete"
                value="complete"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-600"
              >
                Complete
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          <CardDescription>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search jobs by number or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Job Description</TableHead>
                <TableHead>Date Work Commenced</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Operative/Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.jobNumber}</TableCell>
                  <TableCell>{getClientName(job)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{getClientAddress(job)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{job.jobDescription}</TableCell>
                  <TableCell className="text-gray-500">
                    {formatDate(job.dateWorkCommenced)}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(job.price)}</TableCell>
                  <TableCell>{getEmployeeName(job)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getJobStatusColor(job.status)}
                    >
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {job.invoicePaid ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">No</span>
                      </div>
                    )}
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

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No jobs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
