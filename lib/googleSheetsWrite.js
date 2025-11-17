import path from 'node:path'
import { google } from 'googleapis'

// Helper to extract Spreadsheet ID from either DATA_SHEET or GOOGLE_SHEET_URL
function extractSpreadsheetIdFromUrl(url) {
  if (!url) return null
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m ? m[1] : null
}

async function getSheetsClient() {
  // Prefer explicit credentials from env to avoid committing key file.
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (privateKey) {
    // Support escaped newlines in env (Render / Vercel) using \n
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  let auth
  if (clientEmail && privateKey) {
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  } else {
    // Fallback to local key file if env credentials not provided.
    const keyFile = path.join(process.cwd(), 'bosszaloshop-baa816afc4fc.json')
    auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }
  const authClient = await auth.getClient()
  return google.sheets({ version: 'v4', auth: authClient })
}

async function getSpreadsheetMeta(sheets, spreadsheetId) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId })
  const firstSheet = data.sheets?.[0]
  const sheetId = firstSheet?.properties?.sheetId
  const title = firstSheet?.properties?.title || 'Sheet1'
  return { sheetId, title }
}

export async function insertRowAtIndex({ values, rowIndexOneBased = 3 }) {
  // Determine spreadsheetId from env URLs
  const fromDataSheet = extractSpreadsheetIdFromUrl(process.env.DATA_SHEET)
  const fromCsvUrl = extractSpreadsheetIdFromUrl(process.env.GOOGLE_SHEET_URL)
  const spreadsheetId = fromCsvUrl || fromDataSheet
  if (!spreadsheetId) {
    throw new Error('Không tìm thấy Spreadsheet ID từ GOOGLE_SHEET_URL hoặc DATA_SHEET')
  }

  if (!Array.isArray(values)) {
    throw new Error('Payload "values" phải là mảng một hàng (Array)')
  }

  const sheets = await getSheetsClient()
  const meta = await getSpreadsheetMeta(sheets, spreadsheetId)
  if (!meta.sheetId) {
    throw new Error('Không đọc được sheetId từ Spreadsheet')
  }

  // Convert to zero-based indices for insertDimension
  const startIndex = Math.max(0, rowIndexOneBased - 1)

  // 1) Insert a new empty row at the desired position to shift existing content down
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: meta.sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
            inheritFromBefore: false,
          },
        },
      ],
    },
  })

  // 2) Write the provided values into that row
  const rangeA1 = `${meta.title}!A${rowIndexOneBased}`
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: rangeA1,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      majorDimension: 'ROWS',
      values: [values],
    },
  })

  return { ok: true, spreadsheetId, sheetTitle: meta.title, row: rowIndexOneBased }
}

export async function appendRows({ values }) {
  if (!Array.isArray(values) || !Array.isArray(values[0])) {
    throw new Error('appendRows expects values to be a 2D array of rows')
  }

  const fromDataSheet = extractSpreadsheetIdFromUrl(process.env.DATA_SHEET)
  const fromCsvUrl = extractSpreadsheetIdFromUrl(process.env.GOOGLE_SHEET_URL)
  const spreadsheetId = fromCsvUrl || fromDataSheet
  if (!spreadsheetId) {
    throw new Error('Không tìm thấy Spreadsheet ID từ GOOGLE_SHEET_URL hoặc DATA_SHEET')
  }

  const sheets = await getSheetsClient()
  const meta = await getSpreadsheetMeta(sheets, spreadsheetId)
  const rangeA1 = `${meta.title}!A1`

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: rangeA1,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      majorDimension: 'ROWS',
      values,
    },
  })

  return { ok: true, spreadsheetId, sheetTitle: meta.title, appended: values.length }
}
