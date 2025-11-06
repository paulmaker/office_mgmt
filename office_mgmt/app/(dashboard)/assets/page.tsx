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
import { mockAssets } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'
import { Plus, Truck, Wrench, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'

export default function AssetsPage() {
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

  const vehicles = mockAssets.filter(a => a.type === 'VEHICLE')
  const equipment = mockAssets.filter(a => a.type === 'EQUIPMENT')

  const upcomingReminders = mockAssets.flatMap(asset => {
    const reminders = []
    if (asset.motDueDate) {
      const days = getDaysUntil(asset.motDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'MOT', date: asset.motDueDate, days })
      }
    }
    if (asset.taxDueDate) {
      const days = getDaysUntil(asset.taxDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Tax', date: asset.taxDueDate, days })
      }
    }
    if (asset.insuranceDueDate) {
      const days = getDaysUntil(asset.insuranceDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Insurance', date: asset.insuranceDueDate, days })
      }
    }
    if (asset.serviceDueDate) {
      const days = getDaysUntil(asset.serviceDueDate)
      if (days !== null && days <= 30) {
        reminders.push({ asset: asset.name, type: 'Service', date: asset.serviceDueDate, days })
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-3xl">{mockAssets.length}</CardTitle>
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
                <TableHead>Reminders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
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
                      {vehicle.remindersEnabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-gray-400 text-sm">Disabled</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
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
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
