import { getSheetData } from '../lib/sheets'
import SheetTableClient from './SheetTableClient'

export default async function HomePage() {
  let data
  let error
  try {
    data = await getSheetData()
  } catch (e) {
    error = e?.message || 'Lỗi không xác định khi tải dữ liệu.'
  }

  const sheetLink = process.env.DATA_SHEET

  if (error) {
    return (
      <main style={{ padding: '24px' }}>
        <h1 style={{ fontSize: 24, margin: 0, marginBottom: 8 }}>Dữ liệu từ Google Sheet</h1>
        {sheetLink ? (
          <p style={{ marginTop: 0 }}>
            Nguồn: <a href={sheetLink} target="_blank" rel="noreferrer">Mở bảng tính</a>
          </p>
        ) : null}
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8 }}>
          {error}
        </div>
      </main>
    )
  }

  const { headers, rows } = data || { headers: [], rows: [] }

  return (
    <main style={{ padding: '24px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Dữ liệu từ Google Sheet</h1>
        {sheetLink ? (
          <a href={sheetLink} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#2563eb' }}>
            Mở bảng tính gốc
          </a>
        ) : null}
      </header>

      <section style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, color: '#374151' }}>
          Tổng số dòng: <strong>{rows.length}</strong>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        {rows.length === 0 ? (
          <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: 8 }}>Không có dữ liệu để hiển thị.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <SheetTableClient headers={headers} rows={rows} />
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                      {h || `Cột ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ background: rIdx % 2 ? '#fff' : '#fbfdff' }}>
                    {headers.map((h, cIdx) => (
                      <td key={cIdx} style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        {String(row[h || `Col ${cIdx + 1}`] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
