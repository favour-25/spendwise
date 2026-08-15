import { NextResponse } from 'next/server'
import { parseCSV } from '@/lib/finance'

export const runtime = 'nodejs'

/**
 * POST /api/upload
 *
 * Receives a CSV file (multipart/form-data, field name "file"), validates
 * it, and returns the cleaned + categorized transactions as JSON.
 *
 * Nothing here is written to disk or a database — the file is read into
 * memory for the lifetime of this single request only, then discarded.
 */
export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Could not read the upload. Please try again.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
  }

  const filename = file instanceof File ? file.name : 'upload.csv'
  const looksLikeCSV =
    filename.toLowerCase().endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel'

  if (!looksLikeCSV) {
    return NextResponse.json(
      { error: 'Only .csv files are supported.' },
      { status: 400 },
    )
  }

  const text = await file.text()
  const { transactions, errors } = parseCSV(text)

  // No valid transactions could be produced at all (e.g. missing required
  // columns, or every row was malformed) — reject the upload.
  if (transactions.length === 0) {
    return NextResponse.json(
      { error: errors[0] || 'No valid transactions were found in this file.' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    transactions,
    // Rows that were skipped are reported back but don't block the upload.
    warnings: errors,
  })
}
