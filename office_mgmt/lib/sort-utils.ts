export type SortDirection = 'asc' | 'desc'

export type SortConfig = {
  column: string
  direction: SortDirection
}

export function toggleSort(current: SortConfig | null, column: string): SortConfig | null {
  if (!current || current.column !== column) {
    return { column, direction: 'desc' }
  }
  if (current.direction === 'desc') {
    return { column, direction: 'asc' }
  }
  return null
}

export function sortData<T>(
  data: T[],
  config: SortConfig | null,
  accessor: (item: T, column: string) => unknown
): T[] {
  if (!config) return data

  return [...data].sort((a, b) => {
    const aVal = accessor(a, config.column)
    const bVal = accessor(b, config.column)

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let comparison = 0

    if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' })
    }

    return config.direction === 'asc' ? comparison : -comparison
  })
}

export function filterByDateRange<T>(
  data: T[],
  dateAccessor: (item: T) => Date | string | null | undefined,
  from: string | null,
  to: string | null
): T[] {
  if (!from && !to) return data

  const fromDate = from ? new Date(from + 'T00:00:00') : null
  const toDate = to ? new Date(to + 'T23:59:59') : null

  return data.filter(item => {
    const raw = dateAccessor(item)
    if (!raw) return false
    const d = raw instanceof Date ? raw : new Date(raw)
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })
}
