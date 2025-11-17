// Utility to fetch and parse Google Sheet CSV into headers + row objects
// Assumes environment variables:
// - GOOGLE_SHEET_URL: gviz CSV URL
// - SHEET_HEADER_ROW: 1-based index of the header row (defaults to 1)
import { parse } from 'csv-parse/sync'

// Extract spreadsheet ID and gid from a Google Sheets URL (edit/view link)
function extractIdsFromSheetUrl(url) {
  if (!url) return { spreadsheetId: null, gid: null }
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = url.match(/[?#&]gid=(\d+)/)
  return {
    spreadsheetId: idMatch ? idMatch[1] : null,
    gid: gidMatch ? gidMatch[1] : null,
  }
}

function deriveCsvUrlFromEnv() {
  // Prefer DATA_SHEET if provided, otherwise fall back to GOOGLE_SHEET_URL
  const dataSheetUrl = process.env.DATA_SHEET
  if (dataSheetUrl) {
    const { spreadsheetId, gid } = extractIdsFromSheetUrl(dataSheetUrl)
    if (spreadsheetId) {
      const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`
      return gid ? `${base}&gid=${gid}` : base
    }
  }
  return process.env.GOOGLE_SHEET_URL || null
}

export async function getSheetData() {
  const url = deriveCsvUrlFromEnv()
  if (!url) {
    throw new Error('Thiếu cấu hình DATA_SHEET hoặc GOOGLE_SHEET_URL trong biến môi trường')
  }

  // Default header row is 1 (first row); env is 1-based
  const headerRowOneBased = Number(process.env.SHEET_HEADER_ROW) || 1
  const headerIndex = Math.max(0, headerRowOneBased - 1)

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet CSV: ${res.status} ${res.statusText}`)
  }
  const csvText = await res.text()

  // Parse to array of arrays; keep empty lines to preserve row indices
  const records = parse(csvText, {
    bom: true,
    skip_empty_lines: false,
    relax_column_count: true,
  })

  if (!Array.isArray(records) || records.length === 0) {
    return { headers: [], rows: [] }
  }

  // Ensure header row exists
  const headers = (records[headerIndex] || []).map((h) => String(h || '').trim())

  // Data rows are everything after the header row
  const dataRows = records
    .slice(headerIndex + 1)
    // drop leading empty rows after header, and completely empty rows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const obj = {}
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `Col ${i + 1}`
        obj[key] = row[i] ?? ''
      }
      // Include any extra cells not covered by headers
      for (let j = headers.length; j < row.length; j++) {
        obj[`Extra ${j + 1}`] = row[j] ?? ''
      }
      return obj
    })

  return { headers, rows: dataRows }
}
