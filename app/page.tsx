'use client'

import { useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  PieChart,
  Search,
  Sparkles,
  Upload,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  calculateDashboardData,
  getSampleTransactions,
  type Transaction,
} from '@/lib/finance'

const chartColors = ['#1e4d6b', '#3f7d7a', '#8a9a5b', '#c78b4a', '#8b6f9e', '#6b7280', '#b5a48b']

const categoryStyles: Record<string, string> = {
  Food: 'bg-amber-50 text-amber-800 border-amber-200',
  Rent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Bills: 'bg-lime-50 text-lime-800 border-lime-200',
  Transport: 'bg-sky-50 text-sky-800 border-sky-200',
  Shopping: 'bg-rose-50 text-rose-800 border-rose-200',
  Entertainment: 'bg-violet-50 text-violet-800 border-violet-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
}

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  currencyDisplay: 'symbol',
})

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: typeof WalletCards
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [transactions, setTransactions] = useState<Transaction[]>(getSampleTransactions)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const data = useMemo(() => calculateDashboardData(transactions), [transactions])
  const categories = useMemo(
    () => Object.keys(data.categoryTotals).sort((a, b) => data.categoryTotals[b] - data.categoryTotals[a]),
    [data.categoryTotals],
  )
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return data.transactions.filter((transaction) => {
      const matchesQuery =
        !query ||
        transaction.description.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query)
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [data.transactions, searchQuery, categoryFilter])

  const categoryChartData = categories.map((category) => ({
    name: category,
    value: Math.round(data.categoryTotals[category] * 100) / 100,
  }))

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setUploadMessage('')
    setUploadError('')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setUploadError(result.error || 'Could not process this CSV file.')
        return
      }

      setTransactions(result.transactions as Transaction[])
      const skipped = Array.isArray(result.warnings) ? result.warnings.length : 0
      setUploadMessage(
        `${result.transactions.length} transaction(s) imported and categorized.` +
          (skipped > 0 ? ` ${skipped} row(s) were skipped for missing/invalid data.` : ''),
      )
    } catch {
      setUploadError('Something went wrong while uploading. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function resetToSample() {
    setTransactions(getSampleTransactions())
    setUploadMessage('Sample transactions restored.')
    setUploadError('')
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <WalletCards aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="font-serif text-xl font-semibold tracking-tight text-primary">SpendWise</p>
              <p className="text-xs text-muted-foreground">Student expense analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetToSample}>
              <Sparkles data-icon="inline-start" />
              <span className="hidden sm:inline">Use sample data</span>
              <span className="sm:hidden">Sample</span>
            </Button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
            />
            <Button size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              {isUploading ? 'Uploading…' : 'Upload CSV'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit gap-1.5 bg-primary/10 text-primary">
            <CheckCircle2 className="size-3.5" />
            Local analysis · private by default
          </Badge>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Your spending, made clear.</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Upload a bank statement or explore the sample view to understand where your money goes. SpendWise categorizes transactions automatically in your browser.
          </p>
        </section>

        {uploadError && (
          <Alert variant="destructive" className="relative">
            <FileSpreadsheet className="size-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
            <button
              aria-label="Dismiss upload error"
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
              onClick={() => setUploadError('')}
              type="button"
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}

        {uploadMessage && (
          <Alert className="relative border-primary/20 bg-primary/5">
            <FileSpreadsheet className="size-4" />
            <AlertTitle>Import update</AlertTitle>
            <AlertDescription>{uploadMessage}</AlertDescription>
            <button
              aria-label="Dismiss import update"
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              onClick={() => setUploadMessage('')}
              type="button"
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}

        <section aria-label="Spending overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={WalletCards} label="Total spending" value={currency.format(data.totalSpend)} helper="Across all transactions" />
          <MetricCard icon={FileSpreadsheet} label="Transactions" value={String(data.transactions.length)} helper="Imported or sampled" />
          <MetricCard icon={PieChart} label="Top category" value={categories[0] || '—'} helper={categories[0] ? currency.format(data.categoryTotals[categories[0]]) : 'No data yet'} />
          <MetricCard icon={BarChart3} label="Avg. transaction" value={currency.format(data.transactions.length ? data.totalSpend / data.transactions.length : 0)} helper="Per transaction" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Weekly spending</CardTitle>
              <CardDescription>How your spending changes over time</CardDescription>
            </CardHeader>
            <CardContent className="h-72 px-2 sm:px-6">
              {data.weeklySpend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklySpend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={(value) => `₦${value}`} />
                    <Tooltip cursor={{ fill: 'var(--muted)' }} formatter={(value) => [currency.format(Number(value)), 'Spending']} />
                    <Bar dataKey="amount" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Upload a CSV to see your weekly trend.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Spending by category</CardTitle>
              <CardDescription>Your largest expense areas</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {categoryChartData.length > 0 ? (
                <>
                  <div className="h-56 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3} stroke="var(--card)">
                          {categoryChartData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => currency.format(Number(value))} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {categoryChartData.map((item, index) => (
                      <div className="flex items-center justify-between gap-3 text-sm" key={item.name}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                          <span className="truncate text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium">{currency.format(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-56 w-full items-center justify-center text-sm text-muted-foreground">No categories yet.</div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
              <p className="text-sm text-muted-foreground">Search and filter the transactions used in your overview.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search transactions" className="pl-9" placeholder="Search transactions" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? 'all')}>
                <SelectTrigger aria-label="Filter by category" className="w-full sm:w-44">
                  <Filter data-icon="inline-start" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                      <TableCell className="min-w-48 font-medium">{transaction.description}</TableCell>
                      <TableCell><Badge variant="outline" className={categoryStyles[transaction.category] || categoryStyles.Other}>{transaction.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{currency.format(transaction.amount)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell className="h-28 text-center text-muted-foreground" colSpan={4}>No transactions match your filters.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span>Showing {filteredTransactions.length} of {data.transactions.length} transactions</span>
              <span className="hidden sm:inline">All analysis happens locally in your browser</span>
            </div>
          </Card>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/70 pt-6 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>SpendWise · A simple way to learn from your spending.</span>
          <span>CSV files stay on your device and are never uploaded.</span>
        </footer>
      </div>
    </main>
  )
}

