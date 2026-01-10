import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function calculateCISDeduction(amount: number, cisStatus: string): number {
  if (cisStatus === 'NOT_VERIFIED') {
    return amount * 0.30 // 30% for unverified
  } else if (cisStatus === 'VERIFIED_NET') {
    return amount * 0.20 // 20% for verified net
  }
  return 0 // 0% for verified gross
}

export function calculateVAT(amount: number, rate: number = 20): number {
  return amount * (rate / 100)
}

export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'text-gray-500 bg-gray-100',
    SENT: 'text-blue-500 bg-blue-100',
    PAID: 'text-green-500 bg-green-100',
    OVERDUE: 'text-red-500 bg-red-100',
    CANCELLED: 'text-gray-500 bg-gray-100',
  }
  return colors[status] || 'text-gray-500 bg-gray-100'
}

export function getTimesheetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SUBMITTED: 'text-blue-500 bg-blue-100',
    APPROVED: 'text-green-500 bg-green-100',
    REJECTED: 'text-red-500 bg-red-100',
    PROCESSED: 'text-purple-500 bg-purple-100',
    PAID: 'text-green-600 bg-green-100',
  }
  return colors[status] || 'text-gray-500 bg-gray-100'
}

export function generateInvoiceNumber(type: 'SALES' | 'PURCHASE'): string {
  const prefix = type === 'SALES' ? 'INV' : 'PO'
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${year}${month}-${random}`
}

export function getJobStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-100',
    IN_PROGRESS: 'text-blue-600 bg-blue-100',
    COMPLETE: 'text-green-600 bg-green-100',
  }
  return colors[status] || 'text-gray-500 bg-gray-100'
}