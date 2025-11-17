// Helpers to mark exported Shopify orders in Firebase Realtime Database
// Uses REST API to avoid server SDK complexity. Keep rules permissive for writes
// or add auth if needed later.

const DEFAULT_RTDB = 'https://glowgift-4552a-default-rtdb.firebaseio.com'

function baseUrl() {
  return process.env.FIREBASE_RTDB_URL || DEFAULT_RTDB
}

function orderKey(orderId) {
  return `${baseUrl().replace(/\/$/, '')}/order/${encodeURIComponent(orderId)}.json`
}

export async function isOrderExported(orderId) {
  const url = orderKey(orderId)
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data)
}

export async function markOrderExported(orderId) {
  const url = orderKey(orderId)
  const body = JSON.stringify(true)
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Failed to mark order ${orderId} exported: ${res.status} ${res.statusText} ${txt}`)
  }
  return true
}

export async function unmarkOrder(orderId) {
  const url = orderKey(orderId)
  const res = await fetch(url, { method: 'DELETE' })
  return res.ok
}

export async function markMany(orderIds = []) {
  const results = {}
  for (const id of orderIds) {
    try {
      await markOrderExported(id)
      results[id] = true
    } catch (e) {
      results[id] = false
    }
  }
  return results
}

// Fetch all exported order IDs in one request to reduce per-ID round trips
export async function getAllExportedIds() {
  const url = `${baseUrl().replace(/\/$/, '')}/order.json`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return new Set()
    const data = await res.json()
    if (!data || typeof data !== 'object') return new Set()
    return new Set(Object.keys(data))
  } catch (_) {
    return new Set()
  }
}
