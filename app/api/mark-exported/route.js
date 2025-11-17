import { NextResponse } from 'next/server'
import { isOrderExported, markMany } from '../../../lib/exportMarkers'

export async function POST(request) {
  try {
    const { orderIds } = await request.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'orderIds must be a non-empty array' }, { status: 400 })
    }
    const results = await markMany(orderIds)
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })
  }
  const exported = await isOrderExported(id)
  return NextResponse.json({ ok: true, id, exported })
}
