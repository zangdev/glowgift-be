import { getSheetData } from './sheets'
import { appendRows } from './googleSheetsWrite'
import { isOrderExported, markOrderExported } from './exportMarkers'

function findOrderId(headers, row) {
  if (!headers || !row) return null
  const pairs = headers.map((h) => ({ raw: h, key: String(h || '').trim().toLowerCase() }))
  const candidates = [
    'stt',
    'order id',
    'orderid',
    'id',
    'order_id',
    'order number',
    'order_number',
    'order',
  ]
  for (const c of candidates) {
    const f = pairs.find((p) => p.key === c)
    if (f && f.raw) {
      const v = row[f.raw]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
    }
  }
  return null
}

export async function runExportJob({ dryRun = false } = {}) {
  const summary = {
    totalRows: 0,
    withId: 0,
    alreadyExported: 0,
    willAppend: 0,
    appended: 0,
    marked: 0,
    idsAppended: [],
    idsMarked: [],
    skippedNoId: 0,
  }

  // 1) Read source sheet (DATA_SHEET preferred via lib/sheets)
  const { headers, rows } = await getSheetData()
  summary.totalRows = rows.length

  // 2) Filter rows by not yet exported
  const candidates = []
  for (const r of rows) {
    const id = findOrderId(headers, r)
    if (!id) {
      summary.skippedNoId++
      continue
    }
    summary.withId++
    // Check RTDB marker
    // Note: sequential to be gentle; can batch if needed
    const exported = await isOrderExported(id)
    if (!exported) {
      candidates.push({ id, row: r })
    } else {
      summary.alreadyExported++
    }
  }

  if (candidates.length === 0) {
    return { ...summary, message: 'No new rows to append' }
  }

  // 3) Build values matrix in source header order
  const values = candidates.map(({ row, id }) => {
    return headers.map((h, i) => row[h || `Col ${i + 1}`] ?? '')
  })
  summary.willAppend = values.length

  // 4) Append to target sheet
  if (!dryRun) {
    const res = await appendRows({ values })
    if (res?.ok) {
      summary.appended = values.length
    }
  }
  summary.idsAppended = candidates.map((c) => c.id)

  // 5) Mark as exported in RTDB
  if (!dryRun) {
    for (const c of candidates) {
      try {
        await markOrderExported(c.id)
        summary.marked++
        summary.idsMarked.push(c.id)
      } catch (_) {
        // ignore marking error; continue
      }
    }
  }

  return summary
}

export default runExportJob
