// Shared date-range resolution for pages with a "This week / month / quarter /
// year / all time / custom" picker — used by Dashboard and Leaderboard so
// both interpret the same range query params identically.
export function getDateRange(range?: string, from?: string, to?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (from && to) {
    return { start: new Date(from), end: new Date(to), label: 'Custom' }
  }

  switch (range) {
    case 'week': {
      const start = new Date(now)
      // Monday-based week (Mon=0 offset)
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      start.setHours(0, 0, 0, 0)
      return { start, end, label: 'This week' }
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      return { start, end, label: 'This quarter' }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end, label: 'This year' }
    }
    case 'all': {
      return { start: new Date(2000, 0, 1), end, label: 'All time' }
    }
    default: {
      // This month
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end, label: 'This month' }
    }
  }
}
