import { format } from 'date-fns'

interface FinancialYearConfig {
  startMonth: number // 1-12
  startDay: number   // 1-31
}

/**
 * Get the start of the financial year that contains the given date.
 */
export function getFinancialYearStart(date: Date, config: FinancialYearConfig): Date {
  const { startMonth, startDay } = config
  // Try this calendar year's FY start
  const candidate = new Date(date.getFullYear(), startMonth - 1, startDay)
  // If the date is before this year's FY start, the FY started last calendar year
  return date >= candidate
    ? candidate
    : new Date(date.getFullYear() - 1, startMonth - 1, startDay)
}

/**
 * Get the end of the financial year that contains the given date (day before next FY start).
 */
export function getFinancialYearEnd(date: Date, config: FinancialYearConfig): Date {
  const fyStart = getFinancialYearStart(date, config)
  const nextFyStart = new Date(fyStart.getFullYear() + 1, fyStart.getMonth(), fyStart.getDate())
  nextFyStart.setDate(nextFyStart.getDate() - 1)
  return nextFyStart
}

/**
 * Get the start of the financial quarter that contains the given date.
 * Quarters are 3-month periods from the financial year start.
 */
export function getFinancialQuarterStart(date: Date, config: FinancialYearConfig): Date {
  const fyStart = getFinancialYearStart(date, config)
  const monthsIntoFY =
    (date.getFullYear() - fyStart.getFullYear()) * 12 +
    (date.getMonth() - fyStart.getMonth())
  const quarterIndex = Math.floor(monthsIntoFY / 3)
  return new Date(
    fyStart.getFullYear(),
    fyStart.getMonth() + quarterIndex * 3,
    fyStart.getDate()
  )
}

/**
 * Get the end of the financial quarter that contains the given date.
 */
export function getFinancialQuarterEnd(date: Date, config: FinancialYearConfig): Date {
  const qStart = getFinancialQuarterStart(date, config)
  const nextQStart = new Date(qStart.getFullYear(), qStart.getMonth() + 3, qStart.getDate())
  nextQStart.setDate(nextQStart.getDate() - 1)
  return nextQStart
}

type Preset = 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter' | 'this-year' | 'last-year'

/**
 * Convert a date preset to a from/to range, using the financial year config
 * for year and quarter presets.
 */
export function presetToRange(preset: Preset, config: FinancialYearConfig): { from: string; to: string } {
  const now = new Date()
  let start: Date
  let end: Date

  switch (preset) {
    case 'this-month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'last-month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      start = lm
      end = new Date(lm.getFullYear(), lm.getMonth() + 1, 0)
      break
    }
    case 'this-quarter':
      start = getFinancialQuarterStart(now, config)
      end = getFinancialQuarterEnd(now, config)
      break
    case 'last-quarter': {
      const prevQDate = new Date(now)
      // Go back to start of current quarter, then one day before = last quarter
      const curQStart = getFinancialQuarterStart(now, config)
      const dayBefore = new Date(curQStart)
      dayBefore.setDate(dayBefore.getDate() - 1)
      start = getFinancialQuarterStart(dayBefore, config)
      end = getFinancialQuarterEnd(dayBefore, config)
      break
    }
    case 'this-year':
      start = getFinancialYearStart(now, config)
      end = getFinancialYearEnd(now, config)
      break
    case 'last-year': {
      const curFyStart = getFinancialYearStart(now, config)
      const dayBeforeFy = new Date(curFyStart)
      dayBeforeFy.setDate(dayBeforeFy.getDate() - 1)
      start = getFinancialYearStart(dayBeforeFy, config)
      end = getFinancialYearEnd(dayBeforeFy, config)
      break
    }
  }

  return {
    from: format(start, 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  }
}
