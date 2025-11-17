import { insertRowAtIndex } from './googleSheetsWrite.js'
import { getAllExportedIds, markOrderExported } from './exportMarkers.js'
import { getSheetData } from './sheets.js'

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
    mode: 'insertAtRow3',
    totalRows: 0,
    withId: 0,
    alreadyExported: 0,
    willInsert: 0,
    inserted: 0,
    marked: 0,
    idsInserted: [],
    idsMarked: [],
    skippedNoId: 0,
  }

  // 1) Read source sheet (DATA_SHEET preferred via lib/sheets)
  const { headers, rows } = await getSheetData()
  summary.totalRows = rows.length

  // 2) Lấy toàn bộ ID đã xuất từ Firebase một lần
  const exportedSet = await getAllExportedIds()

  // 3) Lọc các dòng chưa xuất
  const candidates = []
  for (const r of rows) {
    const id = findOrderId(headers, r)
    if (!id) {
      summary.skippedNoId++
      continue
    }
    summary.withId++
    if (!exportedSet.has(id)) {
      candidates.push({ id, row: r })
    } else {
      summary.alreadyExported++
    }
  }

  if (candidates.length === 0) {
    return { ...summary, message: 'Không có dòng mới chưa xuất' }
  }

  summary.willInsert = candidates.length

  // 4) Chèn từng dòng vào hàng 3 (đảo ngược để giữ thứ tự gốc)
  if (!dryRun) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      const { row, id } = candidates[i]
      const values = headers.map((h, idx) => row[h || `Col ${idx + 1}`] ?? '')
      try {
        await insertRowAtIndex({ values, rowIndexOneBased: 3 })
        summary.inserted++
        summary.idsInserted.push(id)
        await markOrderExported(id)
        summary.marked++
        summary.idsMarked.push(id)
      } catch (e) {
        // Ghi lỗi vào summary nếu cần truy vết
        if (!summary.errors) summary.errors = []
        summary.errors.push({ id, error: e.message })
      }
    }
  } else {
    // Dry-run chỉ liệt kê IDs sẽ chèn
    summary.idsInserted = candidates.map(c => c.id)
  }

  return summary
}

export default runExportJob
