import { NextResponse } from 'next/server'
import { runExportJob } from '../../../lib/exportJob'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dry = searchParams.get('dry')
    const dryRun = dry === '1' || dry === 'true'
    const result = await runExportJob({ dryRun })
    return NextResponse.json({ ok: true, dryRun, result })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
