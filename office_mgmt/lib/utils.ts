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

/** ASCII-only currency for CSV exports; avoids "Â£" when Excel uses wrong encoding */
export function formatCurrencyForCSV(amount: number): string {
  return `${amount.toFixed(2)} GBP`
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

/**
 * Generate a reference code from a name
 * Always returns exactly 2 uppercase letters
 * Takes first letters of words (prefer company name, fallback to name)
 * Example: "Luxury Homes" -> "LU", "ABC Company" -> "AB", "John Smith" -> "JS"
 */
export function generateReferenceCode(name: string, companyName?: string | null): string {
  const source = (companyName || name).trim()
  
  if (!source) {
    return 'CLX'
  }
  
  // Split into words and filter out common words
  const words = source.split(/\s+/).filter(word => {
    const lower = word.toLowerCase()
    // Filter out common words that don't add value
    return !['the', 'and', 'of', 'for', 'ltd', 'limited', 'llc', 'inc', 'incorporated'].includes(lower)
  })
  
  // Build 3-letter code from words
  let code = ''
  
  if (words.length >= 3) {
    // 3+ words: take first letter of first 3 words
    code = words.slice(0, 3).map(w => w.charAt(0).toUpperCase()).join('')
  } else if (words.length === 2) {
    // 2 words: first letter of first word + first 2 letters of second word
    // Or: first 2 letters of first word + first letter of second word
    const w1 = words[0].toUpperCase()
    const w2 = words[1].toUpperCase()
    if (w2.length >= 2) {
      code = w1.charAt(0) + w2.substring(0, 2)
    } else {
      code = w1.substring(0, 2) + w2.charAt(0)
    }
  } else if (words.length === 1) {
    // 1 word: take first 3 letters
    code = words[0].toUpperCase().substring(0, 3)
  }
  
  // Ensure we have exactly 3 letters
  code = code.replace(/[^A-Z]/g, '') // Remove non-letters
  
  if (code.length >= 3) {
    return code.substring(0, 3)
  }
  
  // Pad with letters if needed
  if (code.length === 2) {
    return code + 'X'
  }
  if (code.length === 1) {
    return code + 'XX'
  }
  
  return 'CLX' // Ultimate fallback
}

/** Result type for server actions – avoids production error sanitization */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/** Type guard for server action result */
export function isServerActionError<T>(
  r: ServerActionResult<T>
): r is { success: false; error: string } {
  return r && typeof r === 'object' && 'success' in r && r.success === false
}