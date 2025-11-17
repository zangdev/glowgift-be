import { NextResponse } from 'next/server'
import { insertRowAtIndex } from '../../../lib/googleSheetsWrite'

export async function POST(request) {
  try {
    const body = await request.json()
    const { values, rowIndex = 3 } = body || {}

    if (!Array.isArray(values)) {
      return NextResponse.json({ ok: false, error: 'Thiếu hoặc sai định dạng values (Array)' }, { status: 400 })
    }

    const result = await insertRowAtIndex({ values, rowIndexOneBased: Number(rowIndex) || 3 })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'Lỗi không xác định' }, { status: 500 })
  }
}
