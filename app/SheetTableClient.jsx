"use client"

import { useState } from 'react'

export default function SheetTableClient({ headers, rows }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState(null)

  const findOrderId = (hdrs, row) => {
    if (!hdrs || !row) return null
    const pairs = hdrs.map((h) => ({ raw: h, key: String(h || '').trim().toLowerCase() }))
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

  const pushFirstRowToRow3 = async () => {
    if (!rows?.length) {
      setMessage({ type: 'warn', text: 'Không có dòng nào để đẩy.' })
      return
    }
    setPending(true)
    setMessage(null)
    try {
      const first = rows[0]
      // Build values array in the same order as headers
      const values = headers.map((h, i) => (first[h || `Col ${i + 1}`] ?? ''))
      const res = await fetch('/api/push-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, rowIndex: 3 }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Đẩy dòng thất bại')
      setMessage({ type: 'ok', text: 'Đã chèn 1 dòng tại hàng số 3.' })

      const orderId = findOrderId(headers, first)
      if (orderId) {
        try {
          const markRes = await fetch('/api/mark-exported', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds: [String(orderId)] }),
          })
          const markData = await markRes.json().catch(() => null)
          if (!markRes.ok || !markData?.ok) throw new Error(markData?.error || 'Đánh dấu xuất thất bại')
          setMessage({ type: 'ok', text: `Đã chèn tại hàng 3 và đánh dấu order ${orderId}.` })
        } catch (e) {
          setMessage({ type: 'warn', text: `Đã chèn tại hàng 3 nhưng không đánh dấu được: ${e?.message || 'lỗi'}` })
        }
      } else {
        setMessage({ type: 'warn', text: 'Đã chèn tại hàng 3, nhưng không tìm thấy Order ID để đánh dấu.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Có lỗi xảy ra.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
        <button onClick={pushFirstRowToRow3} disabled={pending} style={{
          background: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: pending ? 'not-allowed' : 'pointer'
        }}>
          {pending ? 'Đang đẩy…' : 'Đẩy dòng 1 vào hàng 3'}
        </button>
        {message && (
          <span style={{ color: message.type === 'ok' ? '#065f46' : message.type === 'warn' ? '#92400e' : '#991b1b' }}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
