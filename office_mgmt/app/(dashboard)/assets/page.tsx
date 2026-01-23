'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useState, useEffect } from 'react'
import { getAssets, deleteAsset } from '@/app/actions/assets'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Plus, Truck, Wrench, AlertTriangle, CheckCircle, Calendar, Edit, Trash2 } from 'lucide-react'
import type { CompanyAsset } from '@prisma/client'
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
import { AssetForm } from '@/components/assets/asset-form'

export default function AssetsPage() {
  const [assets, setAssets] = useState<CompanyAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<CompanyAsset | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      setIsLoading(true)
      const data = await getAssets()
      setAssets(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load assets',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAsset(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (asset: CompanyAsset) => {
    setEditingAsset(asset)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAsset(id)
      await loadAssets()
      toast({
        variant: 'success',
        title: 'Asset deleted',
        description: 'Asset has been successfully deleted.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete asset',
      })
    } finally {
      setDeleteDialogOpen(false)
      setDeletingAssetId(null)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingAsset(null)
    const action = editingAsset ? 'updated' : 'created'
    toast({
      variant: 'success',
      title: `Asset ${action}`,
      description: `Asset has been successfully ${action}.`,
    })
    loadAssets()
  }
  const getDaysUntil = (date: Date | null) => {
    if (!date) return null
    const today = new Date()
    const target = new Date(date)
    const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getStatusBadge = (daysUntil: number | null) => {
    if (daysUntil === null) return null
    if (daysUntil < 0) return <Badge variant="destructive">Overdue</Badge>
    if (daysUntil <= 7) return <Badge variant="warning">Due Soon</Badge>
    if (daysUntil <= 30) return <Badge variant="secondary">Upcoming</Badge>
    return <Badge variant="success">Current</Badge>
  }

  const vehicles = assets.filter(a => a.type === 'VEHICLE')
  const equipment = assets.filter(a => a.type === 'EQUIPMENT')

  const upcomingReminders = assets.flatMap(asset => {
    const reminders = []
    if (asset.motDueDate && asset.remindersEnabled) {
      const days = getDaysUntil(asset.motDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'MOT', date: asset.motDueDate, days })
      }
    }
    if (asset.taxDueDate && asset.remindersEnabled) {
      const days = getDaysUntil(asset.taxDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Tax', date: asset.taxDueDate, days })
      }
    }
    if (asset.insuranceDueDate && asset.remindersEnabled) {
      const days = getDaysUntil(asset.insuranceDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Insurance', date: asset.insuranceDueDate, days })
      }
    }
    if (asset.serviceDueDate && asset.remindersEnabled) {
      const days = getDaysUntil(asset.serviceDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Service', date: asset.serviceDueDate, days })
      }
    }
    if (asset.leaseExpiryDate && asset.remindersEnabled) {
      const days = getDaysUntil(asset.leaseExpiryDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Lease Expiry', date: asset.leaseExpiryDate, days })
      }
    }
    return reminders
  }).sort((a, b) => a.days - b.days)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets & Reminders</h1>
          <p className="text-gray-500 mt-1">
            Manage company vehicles and equipment
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-3xl">{isLoading ? '...' : assets.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">{vehicles.length} vehicles, {equipment.length} equipment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Reminders</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{upcomingReminders.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Due within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue Items</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {upcomingReminders.filter(r => r.days < 0).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Upcoming Reminders
            </CardTitle>
            <CardDescription>Items requiring attention within 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReminders.map((reminder, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{reminder.asset} - {reminder.type}</p>
                      <p className="text-sm text-gray-500">Due: {formatDate(reminder.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${reminder.days < 0 ? 'text-red-600' : reminder.days <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {reminder.days < 0 ? `${Math.abs(reminder.days)} days overdue` : `${reminder.days} days`}
                    </span>
                    {getStatusBadge(reminder.days)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicles
          </CardTitle>
          <CardDescription>{vehicles.length} company vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>MOT Due</TableHead>
                <TableHead>Tax Due</TableHead>
                <TableHead>Insurance Due</TableHead>
                <TableHead>Service Due</TableHead>
                <TableHead>Lease Expiry</TableHead>
                <TableHead>Company Car</TableHead>
                <TableHead>MerseyFlow</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <p className="text-gray-500">Loading assets...</p>
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <p className="text-gray-500">No vehicles found</p>
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => {
                  const motDays = getDaysUntil(vehicle.motDueDate)
                  const taxDays = getDaysUntil(vehicle.taxDueDate)
                  const insuranceDays = getDaysUntil(vehicle.insuranceDueDate)
                  const serviceDays = getDaysUntil(vehicle.serviceDueDate)

                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.name}</TableCell>
                      <TableCell className="font-mono">{vehicle.registrationNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{vehicle.motDueDate ? formatDate(vehicle.motDueDate) : '-'}</span>
                          {motDays !== null && getStatusBadge(motDays)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{vehicle.taxDueDate ? formatDate(vehicle.taxDueDate) : '-'}</span>
                          {taxDays !== null && getStatusBadge(taxDays)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{vehicle.insuranceDueDate ? formatDate(vehicle.insuranceDueDate) : '-'}</span>
                          {insuranceDays !== null && getStatusBadge(insuranceDays)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{vehicle.serviceDueDate ? formatDate(vehicle.serviceDueDate) : '-'}</span>
                          {serviceDays !== null && getStatusBadge(serviceDays)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicle.leaseExpiryDate ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{formatDate(vehicle.leaseExpiryDate)}</span>
                            {getDaysUntil(vehicle.leaseExpiryDate) !== null && 
                              getStatusBadge(getDaysUntil(vehicle.leaseExpiryDate))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.companyCar ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.merseyFlow ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.remindersEnabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-gray-400 text-sm">Disabled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vehicle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingAssetId(vehicle.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Equipment
          </CardTitle>
          <CardDescription>{equipment.length} items</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Insurance Due</TableHead>
                <TableHead>Service Due</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => {
                const insuranceDays = getDaysUntil(item.insuranceDueDate)
                const serviceDays = getDaysUntil(item.serviceDueDate)

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{item.insuranceDueDate ? formatDate(item.insuranceDueDate) : '-'}</span>
                        {insuranceDays !== null && getStatusBadge(insuranceDays)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{item.serviceDueDate ? formatDate(item.serviceDueDate) : '-'}</span>
                        {serviceDays !== null && getStatusBadge(serviceDays)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{item.notes}</TableCell>
                    <TableCell>
                      {item.remindersEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-gray-400 text-sm">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingAssetId(item.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Asset' : 'Create New Asset'}
            </DialogTitle>
          </DialogHeader>
          <AssetForm
            asset={editingAsset}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsDialogOpen(false)
              setEditingAsset(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAssetId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAssetId) {
                  handleDelete(deletingAssetId)
                }
              }}
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
