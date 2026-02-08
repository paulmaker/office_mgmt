'use client'

import { useState, useEffect } from 'react'
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
import { JobForm } from '@/components/jobs/job-form'
import { getJobs, deleteJob, getJob, sendJobSheetEmail } from '@/app/actions/jobs'
import { formatCurrency, formatDate, getJobStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Trash2, CheckCircle2, XCircle, Users, Mail } from 'lucide-react'
import type { Job } from '@prisma/client'

type JobWithRelations = Job & {
  client: { name: string; companyName: string | null; address: string | null }
  employees: Array<{ employee: { name: string } }>
  subcontractors: Array<{ subcontractor: { name: string } }>
  lineItems: Array<{ description: string; amount: number }>
}

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobWithRelations | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<JobWithRelations | null>(null)
  const [emailingJobId, setEmailingJobId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setIsLoading(true)
      const data = await getJobs()
      setJobs(data as JobWithRelations[])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load jobs',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClick = () => {
    setEditingJob(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = async (job: JobWithRelations) => {
    try {
      const fullJob = await getJob(job.id)
      setEditingJob(fullJob as JobWithRelations)
      setIsDialogOpen(true)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load job details',
      })
    }
  }

  const handleDeleteClick = (job: JobWithRelations) => {
    setJobToDelete(job)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!jobToDelete) return

    try {
      setDeletingJobId(jobToDelete.id)
      await deleteJob(jobToDelete.id)
      await loadJobs()
      toast({
        variant: 'success',
        title: 'Job deleted',
        description: `Job ${jobToDelete.jobNumber} has been successfully deleted.`,
      })
      setDeleteDialogOpen(false)
      setJobToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job',
      })
    } finally {
      setDeletingJobId(null)
    }
  }

  const handleEmailToContractors = async (job: JobWithRelations) => {
    try {
      setEmailingJobId(job.id)
      const result = await sendJobSheetEmail(job.id)
      if (result.success) {
        const count = job.subcontractors?.length ?? 0
        toast({
          variant: 'success',
          title: 'Job sheet sent',
          description: count > 0
            ? `Job sheet emailed to ${count} contractor${count !== 1 ? 's' : ''}.`
            : 'Job sheet sent.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to send',
          description: result.error ?? 'Could not send job sheet email',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send job sheet',
      })
    } finally {
      setEmailingJobId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    const action = editingJob ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Job ${action}`,
      description: `Job has been successfully ${action}.`,
    })
    setEditingJob(null)
    loadJobs()
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.companyName?.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') return matchesSearch && job.status === 'PENDING'
    if (activeTab === 'in_progress') return matchesSearch && job.status === 'IN_PROGRESS'
    if (activeTab === 'complete') return matchesSearch && job.status === 'COMPLETE'

    return matchesSearch
  })

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'PENDING').length,
    inProgress: jobs.filter(j => j.status === 'IN_PROGRESS').length,
    complete: jobs.filter(j => j.status === 'COMPLETE').length,
    totalValue: jobs.reduce((sum, j) => sum + j.price, 0),
    unpaidValue: jobs.filter(j => !j.invoicePaid).reduce((sum, j) => sum + j.price, 0),
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
        <Button onClick={handleCreateClick}>
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
                value="all"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                All Jobs
              </Tabs.Trigger>
              <Tabs.Trigger
                value="pending"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 data-[state=active]:text-yellow-600"
              >
                Pending
              </Tabs.Trigger>
              <Tabs.Trigger
                value="in_progress"
                className="pb-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                In Progress
              </Tabs.Trigger>
              <Tabs.Trigger
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
                <TableHead>Job Description</TableHead>
                <TableHead>Date Commenced</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Workers</TableHead>
                <TableHead>Line Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice Paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">Loading jobs...</p>
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500">No jobs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.jobNumber}</TableCell>
                    <TableCell>
                      {job.client.companyName || job.client.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{job.jobDescription}</TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(job.dateWorkCommenced)}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(job.price)}</TableCell>
                    <TableCell>
                      {(job.employees && job.employees.length > 0) || (job.subcontractors && job.subcontractors.length > 0) ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span>
                            {[
                              ...job.employees.map(e => e.employee.name),
                              ...job.subcontractors.map(s => s.subcontractor.name)
                            ].join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {job.lineItems?.length || 0} item{job.lineItems?.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
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
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEmailToContractors(job)}
                          disabled={emailingJobId === job.id || !(job.subcontractors?.length)}
                          title={
                            job.subcontractors?.length
                              ? 'Email job sheet to assigned contractors'
                              : 'Assign at least one contractor (subcontractor) to enable'
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(job)}
                          disabled={deletingJobId === job.id}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? 'Edit Job' : 'Create New Job'}
            </DialogTitle>
          </DialogHeader>
          <JobForm
            job={editingJob as any}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete job{' '}
              <strong>{jobToDelete?.jobNumber}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingJobId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
