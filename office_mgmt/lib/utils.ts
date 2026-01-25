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

/**
 * Generate a reference code from a name
 * Always returns exactly 2 uppercase letters
 * Takes first letters of words (prefer company name, fallback to name)
 * Example: "Luxury Homes" -> "LU", "ABC Company" -> "AB", "John Smith" -> "JS"
 */
export function generateReferenceCode(name: string, companyName?: string | null): string {
  const source = (companyName || name).trim()
  
  if (!source) {
    return 'CL'
  }
  
  // Split into words and filter out common words
  const words = source.split(/\s+/).filter(word => {
    const lower = word.toLowerCase()
    // Filter out common words that don't add value
    return !['the', 'and', 'of', 'for', 'ltd', 'limited', 'llc', 'inc', 'incorporated'].includes(lower)
  })
  
  // If we have words, take first letter of each (up to 2 words for 2-letter code)
  if (words.length >= 1) {
    const code = words
      .slice(0, 2) // Take up to 2 words for 2-letter code
      .map(word => {
        // Get first uppercase letter, or first letter if no uppercase
        const upperMatch = word.match(/[A-Z]/)
        if (upperMatch) {
          return upperMatch[0]
        }
        // Fallback to first character, uppercase
        return word.charAt(0).toUpperCase()
      })
      .join('')
    
    // If we have 2 characters, return them
    if (code.length >= 2) {
      return code.substring(0, 2) // Exactly 2 characters
    }
    
    // If only 1 character, pad with second letter of first word or second word
    if (code.length === 1 && words.length > 0) {
      const firstWord = words[0]
      if (firstWord.length > 1) {
        return code + firstWord.charAt(1).toUpperCase()
      }
      if (words.length > 1) {
        return code + words[1].charAt(0).toUpperCase()
      }
      // If still only 1 character, duplicate it
      return code + code
    }
  }
  
  // Fallback: take first 2 uppercase letters from the source
  const upperLetters = source.match(/[A-Z]/g)
  if (upperLetters && upperLetters.length >= 2) {
    return upperLetters.slice(0, 2).join('')
  }
  
  // Final fallback: first 2 characters, uppercase
  const cleaned = source.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2)
  }
  
  // If we still don't have 2 characters, pad with 'X' or duplicate
  if (cleaned.length === 1) {
    return cleaned + 'X'
  }
  
  return 'CL' // Ultimate fallback
}