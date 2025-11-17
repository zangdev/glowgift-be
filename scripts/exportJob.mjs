import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { runExportJob } from '../lib/exportJob.js'

async function main() {
  try {
    const result = await runExportJob({ dryRun: false })
    console.log(JSON.stringify({ ok: true, result }, null, 2))
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }))
    process.exit(1)
  }
}

main()
