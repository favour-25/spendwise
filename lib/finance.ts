export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'Income' | 'Expense'
  category: string
}

export interface DashboardData {
  transactions: Transaction[]
  totalSpend: number
  categoryTotals: Record<string, number>
  weeklySpend: Array<{ week: string; amount: number }>
}

export interface CSVParseResult {
  transactions: Transaction[]
  errors: string[]
}

// The exact columns SpendWise needs to build a transaction. Matching is
// case-insensitive, so "date", "Date" and "DATE" are all accepted.
export const REQUIRED_COLUMNS = ['date', 'description', 'amount', 'type'] as const

const categoryKeywords: Record<string, string[]> = {
  Food: [
    'chicken republic',
    'shoprite',
    'kfc',
    'domino',
    'restaurant',
    'cafe',
    'pizza',
    'burger',
    'coffee',
    'lunch',
    'dinner',
    'breakfast',
    'food',
    'grocery',
    'groceries',
    'market',
    'supermarket',
    'eatery',
  ],
  Rent: ['rent', 'landlord', 'lease', 'hostel', 'accommodation'],
  Bills: [
    'mtn',
    'airtel',
    'glo',
    '9mobile',
    'airtime',
    'data plan',
    'electricity',
    'nepa',
    'phcn',
    'water bill',
    'internet',
    'wifi',
    'utility',
    'utilities',
    'subscription bill',
    'bill',
  ],
  Transport: [
    'uber',
    'bolt',
    'taxi',
    'bus',
    'brt',
    'fuel',
    'petrol',
    'diesel',
    'transport',
    'transportation',
    'parking',
    'train',
    'flight',
  ],
  Shopping: [
    'jumia',
    'konga',
    'amazon',
    'store',
    'mall',
    'clothing',
    'apparel',
    'fashion',
    'retail',
    'shop',
    'purchase',
  ],
  Entertainment: [
    'netflix',
    'spotify',
    'showmax',
    'movie',
    'cinema',
    'concert',
    'game',
    'steam',
    'entertainment',
    'event',
    'theater',
  ],
}

export function categorizeTransaction(description: string): string {
  const lowerDesc = description.toLowerCase()

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
      return category
    }
  }

  return 'Other'
}

function normalizeType(rawType: string): 'Income' | 'Expense' {
  const value = rawType.trim().toLowerCase()
  if (value === 'income' || value === 'credit' || value === 'in') return 'Income'
  return 'Expense'
}

/**
 * Splits a single CSV line into cells. Handles simple quoted fields
 * (e.g. `"1,234.50"`) without pulling in a CSV parsing library.
 */
function splitCSVLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

/**
 * Parses raw CSV text into SpendWise transactions.
 *
 * This is the single source of truth for CSV parsing/validation and is used
 * by both the /api/upload route (server) and, as a fallback, the browser.
 * Required columns: Date, Description, Amount, Type.
 */
export function parseCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)

  if (lines.length < 1) {
    return { transactions: [], errors: ['The CSV file is empty.'] }
  }

  const header = splitCSVLine(lines[0]).map((cell) => cell.toLowerCase())
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column))

  if (missingColumns.length > 0) {
    return {
      transactions: [],
      errors: [
        `Missing required column(s): ${missingColumns.join(', ')}. Expected Date, Description, Amount, Type.`,
      ],
    }
  }

  if (lines.length < 2) {
    return { transactions: [], errors: ['No transaction rows found below the header.'] }
  }

  const dateIndex = header.indexOf('date')
  const descIndex = header.indexOf('description')
  const amountIndex = header.indexOf('amount')
  const typeIndex = header.indexOf('type')

  const transactions: Transaction[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1 // +1 so the error message matches the spreadsheet row
    const cells = splitCSVLine(lines[i])

    const date = cells[dateIndex]?.trim()
    const description = cells[descIndex]?.trim()
    const amount = parseFloat(cells[amountIndex])
    const rawType = cells[typeIndex]?.trim()

    if (!date || !description || !rawType || Number.isNaN(amount)) {
      errors.push(`Row ${rowNumber}: skipped (missing or invalid Date, Description, Amount, or Type).`)
      continue
    }

    const type = normalizeType(rawType)

    transactions.push({
      id: `${date}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      description,
      amount: Math.abs(amount),
      type,
      category: categorizeTransaction(description),
    })
  }

  return { transactions, errors }
}

export function calculateDashboardData(transactions: Transaction[]): DashboardData {
  const expenses = transactions.filter((t) => t.type !== 'Income')

  const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0)

  const categoryTotals: Record<string, number> = {}
  expenses.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
  })

  const weeklyMap: Record<string, number> = {}
  expenses.forEach((t) => {
    const date = new Date(t.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + t.amount
  })

  const weeklySpend = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, amount]) => ({
      week: new Date(week).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      amount: Math.round(amount * 100) / 100,
    }))

  return {
    transactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    totalSpend: Math.round(totalSpend * 100) / 100,
    categoryTotals,
    weeklySpend,
  }
}

export function getSampleTransactions(): Transaction[] {
  const sampleData: Array<{ date: string; description: string; amount: number; type: 'Income' | 'Expense' }> = [
    { date: '2025-01-06', description: 'Shoprite Groceries', amount: 45.23, type: 'Expense' },
    { date: '2025-01-07', description: 'Netflix Subscription', amount: 12.99, type: 'Expense' },
    { date: '2025-01-07', description: 'Uber Ride', amount: 18.75, type: 'Expense' },
    { date: '2025-01-08', description: 'Jumia Purchase', amount: 65.0, type: 'Expense' },
    { date: '2025-01-08', description: 'Chicken Republic', amount: 12.45, type: 'Expense' },
    { date: '2025-01-09', description: 'Bolt Trip', amount: 8.5, type: 'Expense' },
    { date: '2025-01-09', description: 'House Rent', amount: 320.0, type: 'Expense' },
    { date: '2025-01-10', description: 'MTN Airtime', amount: 10.0, type: 'Expense' },
    { date: '2025-01-10', description: 'Electricity Bill', amount: 27.34, type: 'Expense' },
    { date: '2025-01-11', description: 'Movie Theater', amount: 16.5, type: 'Expense' },
    { date: '2025-01-11', description: 'Spotify Premium', amount: 5.65, type: 'Expense' },
    { date: '2025-01-12', description: 'Part-time Job Pay', amount: 150.0, type: 'Income' },
    { date: '2025-01-13', description: 'Konga Order', amount: 38.9, type: 'Expense' },
  ]

  return sampleData.map((t, index) => ({
    id: `${t.date}-${index}`,
    ...t,
    category: categorizeTransaction(t.description),
  }))
}
